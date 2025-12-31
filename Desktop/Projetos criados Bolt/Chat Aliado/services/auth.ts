/**
 * Real Supabase Authentication Service
 */

import { supabase } from './supabaseClient'

export const authService = {
    async signIn(email: string, password: string) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            })

            if (error) {
                console.error('Sign in error:', error)
                return { user: null, error }
            }

            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single()

            return {
                user: {
                    ...data.user,
                    user_metadata: {
                        name: profile?.name || data.user.email,
                        role: profile?.role || 'agent'
                    }
                },
                error: null
            }
        } catch (error) {
            console.error('Sign in error:', error)
            return { user: null, error }
        }
    },

    async signUp(email: string, password: string, name: string) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        role: 'agent'
                    }
                }
            })

            if (error) {
                console.error('Sign up error:', error)
                return { user: null, error }
            }

            // Create profile
            if (data.user) {
                await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        email,
                        name,
                        role: 'agent'
                    })
            }

            return { user: data.user, error: null }
        } catch (error) {
            console.error('Sign up error:', error)
            return { user: null, error }
        }
    },

    async signOut() {
        try {
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.error('Sign out error:', error)
            }
        } catch (error) {
            console.error('Sign out error:', error)
        }
    },

    async getSession() {
        try {
            const { data, error } = await supabase.auth.getSession()
            if (error) {
                console.error('Get session error:', error)
                return null
            }
            return data.session
        } catch (error) {
            console.error('Get session error:', error)
            return null
        }
    }
}
