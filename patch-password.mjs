import pkg from 'pg'
const { Client } = pkg

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.upqqbgtvbacrayzmyjda',
  password: 'Giloniand191197',
  ssl: { rejectUnauthorized: false }
})

async function run() {
  await client.connect()
  try {
    const resAuth = await client.query(`
      update auth.users
      set encrypted_password = crypt('K4lubaead0', gen_salt('bf'))
      where email = 'rickoprayudha@users.noreply.github.com'
      returning id;
    `)
    console.log('Auth updated:', resAuth.rowCount, 'rows')
    
    if (resAuth.rowCount > 0) {
      const resProfile = await client.query(`
        update public.profiles
        set must_change_password = false
        where id = $1
      `, [resAuth.rows[0].id])
      console.log('Profile updated:', resProfile.rowCount, 'rows')
    }
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}
run()
