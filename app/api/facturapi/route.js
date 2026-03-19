import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Recibimos la petición de nuestro propio frontend (React)
    const body = await request.json();
    const { endpoint, method, payload } = body;

    // 2. Extraemos la llave de la bóveda del servidor
    const apiKey = process.env.FACTURAPI_KEY;

    if (!apiKey) {
      console.error("CRÍTICO: No se encontró la llave FACTURAPI_KEY en el servidor.");
      return NextResponse.json({ error: 'Error interno de configuración.' }, { status: 500 });
    }

    // 3. El servidor hace la petición real a Facturapi (Totalmente invisible para el hacker)
    const url = `https://www.facturapi.io/v2/${endpoint}`;
    
    const options = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    // Solo adjuntamos el payload si no es un método GET/DELETE
    if (payload && method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);

    // Si la respuesta es un archivo (como un XML), lo devolvemos como texto
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/xml')) {
        const xmlText = await response.text();
        if (!response.ok) return NextResponse.json({ error: 'Error al descargar XML' }, { status: response.status });
        return new NextResponse(xmlText, { headers: { 'Content-Type': 'application/xml' } });
    }

    // Si la respuesta es JSON estándar (timbrado, cancelación)
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // 4. Devolvemos la victoria al frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error en el Túnel de Facturapi:", error);
    return NextResponse.json({ error: 'Falla de comunicación con el SAT.' }, { status: 500 });
  }
}