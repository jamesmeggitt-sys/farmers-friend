import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [farm, setFarm] = useState(null)
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadFarmContext(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadFarmContext(session.user.id)
      else { setFarm(null); setMember(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadFarmContext(userId) {
    try {
      const { data: memberData } = await supabase
        .from('farm_members')
        .select('*, farms(*)')
        .eq('user_id', userId)
        .single()

      if (memberData) {
        setMember(memberData)
        setFarm(memberData.farms)
      }
    } catch (e) {
      // No farm yet — user needs to create one
    } finally {
      setLoading(false)
    }
  }

  async function signUp(email, password, displayName, farmName) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const userId = data.user.id

    // Create the farm
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .insert({ name: farmName, owner_id: userId })
      .select()
      .single()
    if (farmError) throw farmError

    // Create the member record
    const { data: memberData, error: memberError } = await supabase
      .from('farm_members')
      .insert({ farm_id: farmData.id, user_id: userId, display_name: displayName, role: 'owner' })
      .select('*, farms(*)')
      .single()
    if (memberError) throw memberError

    setFarm(farmData)
    setMember(memberData)

    // Seed default equipment catalogue
    await supabase.from('equipment').insert([
      { farm_id: farmData.id, name: 'Shovel', category: 'Hand Tools' },
      { farm_id: farmData.id, name: 'Wire Strainer', category: 'Fencing' },
      { farm_id: farmData.id, name: 'Chainsaw', category: 'Power Tools' },
      { farm_id: farmData.id, name: 'Forklift', category: 'Machinery' },
      { farm_id: farmData.id, name: 'Tractor', category: 'Machinery' },
      { farm_id: farmData.id, name: 'Spray Pack', category: 'Chemicals / Fuel' },
      { farm_id: farmData.id, name: 'Generator', category: 'Power Tools' },
      { farm_id: farmData.id, name: 'Pressure Washer', category: 'Power Tools' },
      { farm_id: farmData.id, name: 'Angle Grinder', category: 'Power Tools' },
      { farm_id: farmData.id, name: 'Jerry Can - Diesel', category: 'Chemicals / Fuel' },
    ])

    return data
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
    setFarm(null)
    setMember(null)
  }

  async function inviteMember(displayName, email, role = 'worker') {
    if (!farm) throw new Error('No farm loaded')
    // In production you'd send an email invite via Supabase Edge Functions
    // For now we insert by email lookup
    const { data: userData } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', email)
      .single()
    if (!userData) throw new Error('User not found — they must sign up first')
    await supabase.from('farm_members').insert({
      farm_id: farm.id,
      user_id: userData.id,
      display_name: displayName,
      role
    })
  }

  return (
    <AuthContext.Provider value={{ user, farm, member, loading, signUp, signIn, signOut, loadFarmContext }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
