import config from './firebase-applet-config.json' assert { type: 'json' };

async function runStylesQuery() {
  const projectId = config.projectId;
  const dbId = config.firestoreDatabaseId;
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents:runQuery?key=${config.apiKey}`;
  
  const queryBody = {
    structuredQuery: {
      from: [{ collectionId: 'styles' }]
    }
  };

  console.log(`Running query on DB: ${dbId}...`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(queryBody)
    });
    const data = await res.json();
    console.log(`Results:`, JSON.stringify(data, null, 2));
  } catch(e: any) {
    console.error('Error:', e.message);
  }
}

runStylesQuery();
