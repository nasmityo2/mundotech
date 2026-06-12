import type { Metadata } from 'next';

import ResetPasswordClient from './ResetPasswordClient';

export const metadata: Metadata = {
  title: 'Nueva contraseña',
  description: 'Establece una nueva contraseña para tu cuenta MundoTech.',
};

/*
 * PRD-172 / PRD-224: el token de reset ya NO se lee en el servidor. Llega en
 * el fragmento de la URL (#token=...), que el navegador no envía al servidor
 * — sin token en logs SSR ni en historial de proxies. El cliente lo extrae de
 * location.hash y lo valida vía Server Action (POST, no query string).
 * Se mantiene compatibilidad de lectura con ?token= para enlaces antiguos
 * (expiran en 15 min), también solo desde el cliente.
 */
export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
