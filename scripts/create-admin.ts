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
    },
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const createUsers = async () => {
    for (const user of usersToCreate) {
        try {
            const email = `${user.name.toLowerCase()}@example.com`;
            const userCredential = await createUserWithEmailAndPassword(auth, email, user.password);
            const uid = userCredential.user.uid;

            await setDoc(doc(db, 'users', uid), {
                id: uid,
                name: user.name,
                role: user.role,
                birthday: user.birthday,
            });

            console.log(`Successfully created user: ${email} with role: ${user.role}`);
        } catch (error) {
            console.error(`Error creating user: ${user.name}`, error);
        }
    }
};

createUsers().then(() => {
    console.log('Finished creating users.');
    process.exit(0);
});
