// components/tarjetaDato.js


//Aqui definimos que debe de traer la funcion. Llleva un titulo, valor y color. Definimos tambien como será el color, si lo elegimos.
export default function TarjetaDato({ titulo, valor, color = "slate" }) {
  const estilosColor = {
    blue: "border-blue-500/50 text-blue-400",
    green: "border-green-500/50 text-green-400",
    red: "border-red-500/50 text-red-400",
    slate: "border-slate-800 text-slate-400"
  };

  //Aqui lo que sucede, es que le pedimos que regrese esta info que está en el className al page.js principal, junto el parametro que ya le habiamos puesto Page.js (Valor=$3,000). En el caso del color, Viene aqui mismo
  return (
    <div className={`bg-slate-900 border ${estilosColor[color]} p-6 rounded-2xl shadow-lg transition-all hover:scale-[1.02]`}>
      <h3 className="text-xs font-semibold uppercase tracking-widest opacity-80">{titulo}</h3>
      <p className="text-4xl font-bold mt-2 text-white">{valor}</p>
    </div>
  );
}