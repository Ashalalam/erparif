// Quick Medicine Test - Paste in browser console on /customer/medicines page
(async () => {
  console.log('🧪 Quick Medicine Test\n');
  
  // Get supabase from window
  const sb = window.supabase || window.supabaseClient || 
             (await import('/src/lib/supabase.js')).supabase;
  
  if (!sb) {
    console.error('❌ Supabase not found');
    return;
  }
  
  // Test medicines query
  console.log('Fetching medicines...');
  const { data, error } = await sb
    .from('medicines')
    .select('*')
    .eq('status', 'active')
    .limit(5);
  
  if (error) {
    console.error('❌ Error:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error);
  } else {
    console.log(`✅ Found ${data.length} medicines`);
    data.forEach(m => console.log(`   - ${m.name}`));
  }
})();
