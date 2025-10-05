// This script is not part of the app runtime and should be run manually from the command line.
// e.g., bun scripts/create-admin.ts
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, setDoc, doc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase/config';
import 'dotenv/config'

const usersToCreate = [
    {
        name: 'Admin',
        password: 'admin123',
        role: 'admin',
        birthday: '1990-01-01',
    },
    {
        name: 'Waiter',
        password: 'waiter123',
        role: 'waiter',
        birthday: '1995-05-10',
    },
    {
        name: 'Payment',
        password: 'payment123',
        role: 'payment',
        birthday: '1988-09-22',
    }
]

async function createUsers() {
  console.log(`Attempting to create ${usersToCreate.length} users...`);

  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  for (const userData of usersToCreate) {
    const { name, password, role, birthday } = userData;
    const email = `${name.toLowerCase().replace(' ', '.')}@example.com`;

    console.log(`\nCreating user:`);
    console.log(`  Name: ${name}`);
    console.log(`  Email: ${email}`);
    console.log(`  Role: ${role}`);

    try {
      // Step 1: Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('Successfully created user in Firebase Authentication with UID:', user.uid);

      // Step 2: Create the user profile in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userProfile = {
        id: user.uid,
        name: name,
        role: role,
        birthday: birthday,
      };

      await setDoc(userDocRef, userProfile);
      console.log(`Successfully created Firestore profile for ${name}.`);

    } catch (error: any) {
      console.error(`Error creating user ${name}:`, error.message);
      if (error.code === 'auth/email-already-in-use') {
          console.error('This email address is already in use. If you want to reset the user, please do so from the Firebase console.');
      }
    }
  }
}

createUsers().then(() => {
    console.log('\nFinished creating users.');
    process.exit(0);
}).catch((error) => {
    console.error('An unexpected error occurred:', error);
    process.exit(1);
});
