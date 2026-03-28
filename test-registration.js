// Test registration using built-in fetch
async function testRegistration() {
  try {
    console.log('Testing student registration...');
    console.log('Making request to: http://localhost:5000/api/register');

    const response = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@skillbridge.com',
        password: 'password123',
        name: 'Test Student',
        role: 'STUDENT'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Raw response:', text);

    try {
      const data = JSON.parse(text);
      console.log('Parsed response:', JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('✅ Registration successful!');
      } else {
        console.log('❌ Registration failed');
      }
    } catch (parseError) {
      console.log('Response is not JSON');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testRegistration();