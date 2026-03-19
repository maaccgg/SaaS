import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    // 1. EL CADENERO VERIFICA EL GAFETE (Usando el nuevo estándar SSR)
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    // Si no hay sesión válida, abortamos con un error 401 (No Autorizado)
    if (!session) {
      console.warn("Intento de acceso bloqueado en API de Facturapi.");
      return NextResponse.json({ error: 'Acceso Denegado. Intento de intrusión registrado.' }, { status: 401 });
    }

    // 2. Si pasó el escáner, extraemos la petición
    const body = await request.json();
    const { endpoint, method, payload } = body;
    
    // Extraemos la llave de la bóveda del servidor
    const apiKey = process.env.FACTURAPI_KEY;

    if (!apiKey) {
      console.error("CRÍTICO: No se encontró FACTURAPI_KEY en el servidor.");
      return NextResponse.json({ error: 'Error de configuración interna.' }, { status: 500 });
    }

    // 3. Petición segura a Facturapi
    const url = `https://www.facturapi.io/v2/${endpoint}`;
    const options = {
      method: method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };

    if (payload && method !== 'GET' && method !== 'DELETE') {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);

    // Manejo de archivos (XML)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/xml')) {
        const xmlText = await response.text();
        if (!response.ok) return NextResponse.json({ error: 'Error al descargar XML' }, { status: response.status });
        return new NextResponse(xmlText, { headers: { 'Content-Type': 'application/xml' } });
    }

    // Manejo de JSON estándar
    const data = await response.json();
    if (!response.ok) return NextResponse.json(data, { status: response.status });

    return NextResponse.json(data);

  } catch (error) {
    console.error("Error en túnel seguro:", error);
    return NextResponse.json({ error: 'Falla de comunicación interna.' }, { status: 500 });
  }
}