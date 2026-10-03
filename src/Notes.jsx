export default function Notes({ value, onChange }) {
  return (
    <section className="lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <h2 className="mb-2 font-medium">Notas</h2>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escreva aqui. Salva sozinho."
        className="h-48 w-full resize-none bg-transparent lg:h-auto lg:min-h-0 lg:flex-1 rounded-lg border border-slate-200 p-3 text-sm outline-none placeholder:text-slate-300 focus:border-slate-800"
      />
    </section>
  )
}
