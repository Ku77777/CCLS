/*
  ============================================================
  GUARDADO — Firebase (compartido entre dispositivos, gratis)
  o localStorage (solo este navegador) como respaldo automático.
  ============================================================

  Para conectar Firebase:
  1) Creá un proyecto en https://console.firebase.google.com
  2) Activá "Firestore Database" (modo producción o test) y en
     "Authentication" activá el proveedor "Anonymous".
  3) En Configuración del proyecto > tus apps > Web, copiá el
     objeto de configuración y pegalo acá abajo, reemplazando
     los valores que dicen "PEGA_TU_...".
  4) Guardá este archivo y listo: mientras isConfigured() dé
     true, el álbum va a guardar en Firestore. Si dejás los
     valores por defecto, sigue funcionando pero solo guarda
     en este navegador (localStorage).
*/

const firebaseConfig = {
  apiKey: "PEGA_TU_API_KEY_ACA",
  authDomain: "PEGA_TU_AUTH_DOMAIN_ACA",
  projectId: "PEGA_TU_PROJECT_ID_ACA",
  storageBucket: "PEGA_TU_STORAGE_BUCKET_ACA",
  messagingSenderId: "PEGA_TU_SENDER_ID_ACA",
  appId: "PEGA_TU_APP_ID_ACA",
};

function isConfigured() {
  return Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.startsWith("PEGA_");
}

async function setupFirebaseStorage() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const { getAuth, signInAnonymously, onAuthStateChanged } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"
  );
  const { getFirestore, doc, getDoc, setDoc } = await import(
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"
  );

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const uidReady = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user.uid);
    });
    signInAnonymously(auth).catch((err) => {
      console.error("No se pudo iniciar sesión anónima en Firebase:", err);
      resolve(null);
    });
  });

  return {
    mode: "firebase",
    load: async () => {
      const uid = await uidReady;
      if (!uid) return null;
      const snap = await getDoc(doc(db, "albumes", uid));
      return snap.exists() ? snap.data().state : null;
    },
    save: async (state) => {
      const uid = await uidReady;
      if (!uid) return false;
      await setDoc(doc(db, "albumes", uid), { state, updatedAt: Date.now() });
      return true;
    },
  };
}

function setupLocalStorage() {
  const KEY = "album-ccls-state";
  return {
    mode: "local",
    load: async () => {
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (err) {
        console.error("No se pudo leer el álbum guardado en este navegador:", err);
        return null;
      }
    },
    save: async (state) => {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
        return true;
      } catch (err) {
        console.error("No se pudo guardar el álbum en este navegador:", err);
        return false;
      }
    },
  };
}

async function init() {
  let storage;
  if (isConfigured()) {
    try {
      storage = await setupFirebaseStorage();
    } catch (err) {
      console.error("Falló la conexión a Firebase, uso guardado local:", err);
      storage = setupLocalStorage();
    }
  } else {
    storage = setupLocalStorage();
  }
  window.AlbumStorage = storage;
  window.dispatchEvent(new Event("album-storage-ready"));
}

init();