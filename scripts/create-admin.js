// Admin User Creation Script using Firebase Admin SDK
// 1. Install: npm install firebase-admin
// 2. Download service account key from Firebase Console → Project Settings → Service Accounts
// 3. Save key as scripts/serviceAccountKey.json
// 4. Run: node scripts/create-admin.js

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function createAdmin(email, password, name) {
  try {
    // 1. Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // 2. Create user document in Firestore with admin role
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      userId: 'ADMIN' + Math.floor(100000 + Math.random() * 900000),
      name: name,
      email: email,
      role: 'admin',
      walletBalance: 0,
      level: 1,
      createdAt: new Date(),
    });

    console.log('✅ Admin user created successfully!');
    console.log('Email:', email);
    console.log('UID:', userRecord.uid);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Change these values before running
const adminEmail = 'admin@dailytaskpay.com';
const adminPassword = 'Admin123!';
const adminName = 'Super Admin';

createAdmin(adminEmail, adminPassword, adminName);
