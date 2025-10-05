// This script is not part of the app runtime and should be run manually from the command line.
// e.g., bun scripts/create-admin.ts
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, setDoc, doc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import 'dotenv/config'

async function createAdmin() {
  const adminName = 'Admin';
  const adminPassword = 'admin123';
  const adminRole = 'admin';

  // This is a simplified way to create an email from a name.
  // In a real application, you would have a more robust way of handling this.
  const adminEmail = `${adminName.toLowerCase().replace(' ', '.')}@example.com`;

  console.log(`Attempting to create admin user:`);
  console.log(`  Name: ${adminName}`);
  console.log(`  Email: ${adminEmail}`);
  console.log(`  Role: ${adminRole}`);

  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  try {
    // Step 1: Create the user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    console.log('Successfully created user in Firebase Authentication with UID:', user.uid);

    // Step 2: Create the user profile in Firestore
    const userDocRef = doc(firestore, 'users', user.uid);
    const userProfile = {
      id: user.uid,
      name: adminName,
      role: adminRole,
      birthday: '1990-01-01', // Default birthday
    };

    await setDoc(userDocRef, userProfile);
    console.log('Successfully created user profile in Firestore.');

    console.log('\nAdmin user created successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('Error creating admin user:', error.message);
    if (error.code === 'auth/email-already-in-use') {
        console.error('This email address is already in use. If you want to reset the user, please do so from the Firebase console.');
    }
    process.exit(1);
  }
}

createAdmin();
