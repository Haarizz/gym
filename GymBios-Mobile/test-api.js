const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('http://localhost:8080/api/mobile/trainer/ledger', {
      headers: { Authorization: 'Bearer test' }
    });
    console.log(JSON.stringify(response.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log('Error Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.log('Network Error:', err.message);
    }
  }
}

test();
