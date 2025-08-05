import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the request is from a super admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Check if user is super admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      throw new Error('Access denied: Super admin required')
    }

    const { email, password, full_name, university_name, license_limit } = await req.json()

    // Create the university admin user with admin privileges (auto-confirmed)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email - this is the correct property name
      user_metadata: {
        full_name,
        role: 'university_admin'
      }
    })

    if (authError) {
      throw new Error(`Failed to create admin user: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create admin user')
    }

    // Wait for profile to be created by trigger
    let profile_id = null
    let retries = 0
    const maxRetries = 10

    while (!profile_id && retries < maxRetries) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', authData.user.id)
        .maybeSingle()

      if (profileData) {
        profile_id = profileData.id
      } else {
        await new Promise(resolve => setTimeout(resolve, 500))
        retries++
      }
    }

    if (!profile_id) {
      throw new Error('Failed to create admin profile')
    }

    // Create the university record
    const { error: universityError } = await supabaseAdmin
      .from('universities')
      .insert({
        name: university_name,
        admin_id: profile_id,
        license_limit,
        license_expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      })

    if (universityError) {
      throw new Error(`Failed to create university: ${universityError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'University and admin user created successfully',
        user_id: authData.user.id 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})