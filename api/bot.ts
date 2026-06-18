export default async function handler(req: any, res: any) {
  const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
  const path = url.pathname;

  // Default values
  let title = "H2O STUDIO – Wedding Concept Gallery";
  let description = "Thư viện ảnh cưới Concept chất lượng cao, nơi hiện thực hóa những khoảnh khắc hạnh phúc của bạn.";
  let imageUrl = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=630&q=80";

  const projectId = "gen-lang-client-0731961518";
  const databaseId = "ai-studio-707665d6-54b7-4137-bee6-a85c048f3af0";
  const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery`;

  try {
    // 1. Check if it's an album URL: /style/:styleSlug/album/:albumSlug
    const albumMatch = path.match(/\/style\/([^\/]+)\/album\/([^\/]+)/);
    // 2. Check if it's a style URL: /style/:styleSlug
    const styleMatch = path.match(/\/style\/([^\/]+)(?:\/)?$/);

    let styleId = null;

    if (albumMatch || styleMatch) {
      const styleSlug = albumMatch ? albumMatch[1] : styleMatch![1];
      
      // Query style by slug
      const styleQueryBody = {
        structuredQuery: {
          from: [{ collectionId: 'styles' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'slug' },
              op: 'EQUAL',
              value: { stringValue: styleSlug }
            }
          },
          limit: 1
        }
      };

      const styleRes = await fetch(baseUrl, {
        method: 'POST',
        body: JSON.stringify(styleQueryBody),
        headers: { 'Content-Type': 'application/json' }
      });
      const styleData = await styleRes.json();

      if (styleData && styleData[0] && styleData[0].document) {
        const doc = styleData[0].document;
        // The document name is like projects/.../databases/.../documents/styles/style123
        const nameParts = doc.name.split('/');
        styleId = nameParts[nameParts.length - 1];

        // Retrieve standard style info
        const docFields = doc.fields;
        if (docFields) {
          title = docFields.title?.stringValue || title;
          description = docFields.description?.stringValue || description;
          imageUrl = docFields.coverImage?.stringValue || imageUrl;
        }

        // If it's an album request, query the album inside this style
        if (albumMatch && styleId) {
          const albumSlug = albumMatch[2];
          const albumQueryBody = {
            structuredQuery: {
              from: [{ collectionId: 'albums' }],
              where: {
                fieldFilter: {
                  field: { fieldPath: 'slug' },
                  op: 'EQUAL',
                  value: { stringValue: albumSlug }
                }
              },
              limit: 1
            }
          };

          // Firestore structuredQuery with parent requires parent path. However, 'from' collectionId 'albums' across all parents can work if we don't specify parent, but it's better to query collection group or specify parent.
          // Wait, 'from' inside runQuery applies to the 'parent' specified in the URL.
          const albumBaseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/styles/${styleId}:runQuery`;
          
          const albumRes = await fetch(albumBaseUrl, {
            method: 'POST',
            body: JSON.stringify(albumQueryBody),
            headers: { 'Content-Type': 'application/json' }
          });
          const albumData = await albumRes.json();

          if (albumData && albumData[0] && albumData[0].document) {
            const albumDocFields = albumData[0].document.fields;
            if (albumDocFields) {
              title = albumDocFields.title?.stringValue || title;
              description = albumDocFields.description?.stringValue || description;
              // If there's an album description, use it, otherwise fall back to style or default
              imageUrl = albumDocFields.coverImage?.stringValue || imageUrl;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Error fetching dynamic tags", err);
  }

  // Return a static HTML page with ONLY the meta tags needed by the crawler.
  // There's no script or body content because crawlers just read the <head>.
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${title} - H2O STUDIO</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${title} - H2O STUDIO">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:type" content="website">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} - H2O STUDIO">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl}">
</head>
<body>
  <p>Đang chuyển hướng...</p>
</body>
</html>
  `);
}
