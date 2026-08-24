import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://upqqbgtvbacrayzmyjda.supabase.co', 'sb_publishable_bc7Ok3dGNi8JTQ-NDs6SjQ_y3KjwG5T')
async function run() {
  const { data, error } = await supabase.from('outbound_transactions').select('id, documents').limit(3)
  if (error) console.error(error)
  console.log('Current:', data)
  
  if (data && data.length > 0) {
    const res = await supabase.from('outbound_transactions').update({
      documents: { pr: 'PR-TEST-001', po: 'PO-DUMMY-999', so: 'SO-123', dn: '', invoice: '' }
    }).eq('id', data[0].id)
    console.log('Updated first row:', res)
    
    const res2 = await supabase.from('outbound_transactions').update({
      documents: { pr: '', po: '', so: '', dn: 'DN-9901', invoice: 'INV-2026-X1' }
    }).eq('id', data[1].id)
    console.log('Updated second row:', res2)
  }
}
run()
