const { query } = require('./src/database/db');

async function checkColumns() {
  try {
    // Check transactions table
    const transResult = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'transactions'"
    );
    console.log('TRANSACTIONS columns:', transResult.rows.map(c => c.column_name).join(', '));

    // Check delivery_persons table
    const deliveryResult = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'delivery_persons'"
    );
    console.log('\nDELIVERY_PERSONS columns:', deliveryResult.rows.map(c => c.column_name).join(', '));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkColumns();
