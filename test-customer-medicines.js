/**
 * Customer Medicine Catalog Diagnostic Script
 * 
 * Open browser console (F12) on the customer medicines page and paste this script
 * This will help diagnose why medicines aren't loading
 */

(async function diagnose() {
  console.log('🔍 CUSTOMER MEDICINES DIAGNOSTIC\n');
  
  // Check if supabase is available
  if (!window.supabase && !window.supabaseClient) {
    console.error('❌ Supabase client not found in window');
    return;
  }
  
  const supabase = window.supabase || window.supabaseClient;
  
  // Test 1: Check authentication
  console.log('1️⃣ Checking authentication...');p[;;p'kknjn]
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError);
    return;
  }
  
  if (!session) {
    console.error('❌ Not logged in');
    return;
  }
  
  console.log('✅ Logged in as:', session.user.email);
  console.log('   User ID:', session.user.id);
  
  // Test 2: Check profile
  console.log('\n2️⃣ Checking profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();
  
  if (profileError) {
    console.error('❌ Profile error:', profileError);
  } else if (!profile) {
    console.error('❌ No profile found');
  } else {
    console.log('✅ Profile found:', profile.role);
  }
  
  // Test 3: Check medicines access
  console.log('\n3️⃣ Testing medicines table access...');
  const { data: medicines, error: medError, count } = await supabase
    .from('medicines')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .limit(5);
  
  if (medError) {
    console.error('❌ Medicines query error:', medError);
    console.error('   Code:', medError.code);
    console.error('   Details:', medError.details);
    console.error('   Hint:', medError.hint);
  } else {
    console.log(`✅ Medicines table accessible: ${count} active medicines`);
    console.log('   Sample:', medicines?.slice(0, 2).map(m => m.name));
  }
  
  // Test 4: Check medicine_batches access
  console.log('\n4️⃣ Testing medicine_batches table access...');
  const { data: batches, error: batchError, count: batchCount } = await supabase
    .from('medicine_batches')
    .select('*', { count: 'exact' })
    .limit(5);
  
  if (batchError) {
    console.error('❌ Medicine batches query error:', batchError);
    console.error('   Code:', batchError.code);
    console.error('   Details:', batchError.details);
  } else {
    console.log(`✅ Medicine batches table accessible: ${batchCount} batches`);
    console.log('   Sample batches:', batches?.length || 0);
  }
  
  // Test 5: Full medicine load test (same as component)
  console.log('\n5️⃣ Testing full medicine load (with batches)...');
  const { data: medicineData, error: medError2 } = await supabase
    .from('medicines')
    .select('*')
    .eq('status', 'active')
    .order('name');
  
  if (medError2) {
    console.error('❌ Full medicine query failed:', medError2);
    return;
  }
  
  console.log(`✅ Loaded ${medicineData?.length || 0} medicines`);
  
  if (medicineData && medicineData.length > 0) {
    const medicineIds = medicineData.map(m => m.id);
    const { data: batchData, error: batchError2 } = await supabase
      .from('medicine_batches')
      .select('*')
      .in('medicine_id', medicineIds)
      .order('expiry_date', { ascending: true });
    
    if (batchError2) {
      console.error('❌ Batch query failed:', batchError2);
      return;
    }
    
    console.log(`✅ Loaded ${batchData?.length || 0} batches`);
    
    // Calculate stock
    const medicinesWithStock = medicineData.map(medicine => {
      const availableBatches = batchData?.filter(b => 
        b.medicine_id === medicine.id &&
        b.current_quantity > 0 && 
        new Date(b.expiry_date) >= new Date()
      ) || [];
      
      const totalStock = availableBatches.reduce((sum, b) => sum + b.current_quantity, 0);
      
      return {
        name: medicine.name,
        in_stock: totalStock > 0,
        stock: totalStock,
        batches: availableBatches.length
      };
    });
    
    console.log('\n📊 Stock Summary:');
    console.log(`   Total medicines: ${medicinesWithStock.length}`);
    console.log(`   In stock: ${medicinesWithStock.filter(m => m.in_stock).length}`);
    console.log(`   Out of stock: ${medicinesWithStock.filter(m => !m.in_stock).length}`);
    
    console.log('\n📋 Sample medicines:');
    medicinesWithStock.slice(0, 5).forEach(m => {
      console.log(`   ${m.in_stock ? '✅' : '❌'} ${m.name}: ${m.stock} units (${m.batches} batches)`);
    });
  }
  
  console.log('\n✅ DIAGNOSTIC COMPLETE');
  console.log('\nIf all tests passed but page is blank, check:');
  console.log('1. Browser console for React errors');
  console.log('2. Network tab for failed API calls');
  console.log('3. React component state (React DevTools)');
})();
