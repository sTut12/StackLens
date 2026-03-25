import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyB6amIe-9yJy1MxSIuqEhSvfsP6-fKrew0",
  authDomain: "stacklens-fd04f.firebaseapp.com",
  databaseURL: "https://stacklens-fd04f-default-rtdb.firebaseio.com",
  projectId: "stacklens-fd04f",
  storageBucket: "stacklens-fd04f.firebasestorage.app",
  messagingSenderId: "591347018503",
  appId: "1:591347018503:web:239c2aacde52be38c133a2",
  measurementId: "G-9WX2KJ3HBH"
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export default app
