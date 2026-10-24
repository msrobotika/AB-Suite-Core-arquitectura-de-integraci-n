/** Native BI validation keeps the same semantics as its own importer. MIT. */
export async function validateBI(document) {
  const response = await fetch('/apps/bi/api/project/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(document)
  });
  if (!response.ok) {
    let message = 'El motor BI no está disponible para validar el proyecto';
    try {
      const body = await response.json();
      message = body.detail ?? body.error ?? message;
    } catch {}
    throw Error(
      typeof message === 'string' ? message : 'Datos BI incompatibles'
    );
  }
}
export const validationOptions = { validateBI };
export function downloadExercise(project) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(project)], { type: 'application/json' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download =
    (project.name.replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 70) ||
      'Ejercicio') + '.absuite';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
