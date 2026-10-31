// Quando a administração mostra o botão "Cancelar reserva": reserva que ainda
// não foi cancelada e ainda não terminou (em andamento ou futura). É só o que
// aparece na tela; quem decide de verdade é o serviço, que confere de novo.
export function adminCanCancel(
  reservation: { status: string; endAt: Date },
  now: Date,
): boolean {
  return (
    reservation.status !== "CANCELLED" &&
    reservation.endAt.getTime() > now.getTime()
  );
}
