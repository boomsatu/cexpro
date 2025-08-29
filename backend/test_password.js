const bcrypt = require('bcryptjs');

const testPassword = async () => {
  const plainPassword = 'Admin123!@#';
  const hashedFromDB = '$2a$12$5iYTnXQhXMS5CK58imnbau.RXdT/AEfG8eaBfa6wAk03H6BZf3.AW';
  
  console.log('Plain password:', plainPassword);
  console.log('Plain password length:', plainPassword.length);
  console.log('Hashed from DB:', hashedFromDB);
  
  // Test comparison
  const isValid = await bcrypt.compare(plainPassword, hashedFromDB);
  console.log('Password comparison result:', isValid);
  
  // Create new hash for comparison
  const newHash = await bcrypt.hash(plainPassword, 12);
  console.log('New hash created:', newHash);
  
  // Test new hash
  const isNewHashValid = await bcrypt.compare(plainPassword, newHash);
  console.log('New hash comparison result:', isNewHashValid);
};

testPassword().catch(console.error);