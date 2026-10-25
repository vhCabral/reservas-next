// role="alert" faz o leitor de tela anunciar o erro assim que ele aparece.
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message: string }) {
  return (
    <p
      role="status"
      className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
    >
      {message}
    </p>
  );
}
