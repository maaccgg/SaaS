import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // ==========================================
    // FASE 1: EL CADENERO EXIGE GAFETE
    // ==========================================
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Acceso Denegado. Se requiere autenticación.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

// Iniciamos el cliente conectando tu gafete a todas las peticiones internas
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}` // <--- EL CADENERO LLEVA EL GAFETE AL ARCHIVERO
          }
        }
      }
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Gafete inválido o expirado.' }, { status: 401 });
    }

    // ==========================================
    // FASE 2: VERIFICACIÓN DE RANGO (ADMIN)
    // ==========================================
    // Ahora el archivero (RLS) sí nos dejará leer porque traemos el token
    const { data: perfilPeticionario, error: perfilError } = await supabaseAuth
      .from('perfiles')
      .select('rol, empresa_id')
      .eq('id', user.id)
      .single();

    if (perfilError || perfilPeticionario?.rol !== 'administrador') {
      return NextResponse.json({ error: 'Intrusión bloqueada: Solo un administrador puede crear usuarios.' }, { status: 403 });
    }

    // ==========================================
    // FASE 3: CREACIÓN SEGURA (USANDO LLAVE MAESTRA)
    // ==========================================
    const body = await request.json();
    const { email, password, nombre_completo, rol } = body;
    
    // OBLIGATORIO: El nuevo usuario hereda la empresa del administrador. 
    // Ignoramos el empresa_id del body para evitar inyecciones.
    const idDeLaEmpresaFija = perfilPeticionario.empresa_id || user.id;

    // Ahora sí, sacamos la llave maestra para operar
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Crear credencial en Bóveda
    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true 
    });

    if (createAuthError) throw createAuthError;

    // 2. Crear perfil operativo blindado
    const { error: insertPerfilError } = await supabaseAdmin.from('perfiles').insert([
      {
        id: authData.user.id,
        email: email,
        nombre_completo: nombre_completo,
        rol: rol, // Aquí puedes confiar en el body porque ya verificaste que es un Admin quien lo manda
        empresa_id: idDeLaEmpresaFija
      }
    ]);

    if (insertPerfilError) throw insertPerfilError;

    return NextResponse.json({ success: true, message: 'Usuario creado y asegurado con éxito' }, { status: 200 });

  } catch (error) {
    console.error("Falla en creación de usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}