/**
 * Traduit une erreur Axios/réseau en message français compréhensible par l'utilisateur.
 * @param {any} error - L'erreur interceptée
 * @returns {string} Message en français
 */
export function getErrorMessage(error) {
  if (!error) return 'Une erreur inconnue est survenue.';

  // Timeout
  if (error.code === 'ECONNABORTED' || error.isTimeout) {
    return 'La connexion a pris trop de temps. Vérifiez votre réseau et réessayez.';
  }

  // Pas de connexion réseau
  if (
    error.code === 'ENOTFOUND' ||
    error.code === 'ERR_NETWORK' ||
    error.message === 'Network Error' ||
    error.message?.includes('Network request failed')
  ) {
    return 'Pas de connexion internet. Vérifiez votre réseau Wi-Fi ou données mobiles.';
  }

  // Réponse serveur avec message en français déjà présent
  const serverMsg =
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.error;

  if (serverMsg && typeof serverMsg === 'string' && serverMsg.length < 200) {
    return serverMsg;
  }

  // Codes HTTP
  switch (error.response?.status) {
    case 400:
      return 'Informations incorrectes. Vérifiez ce que vous avez saisi.';
    case 401:
      return 'Vous n\'êtes pas connecté. Veuillez vous reconnecter.';
    case 403:
      return 'Vous n\'avez pas accès à cette fonctionnalité.';
    case 404:
      return 'Information introuvable. Elle a peut-être été supprimée.';
    case 409:
      return 'Un conflit existe. Ces informations sont peut-être déjà enregistrées.';
    case 422:
      return 'Les informations fournies sont invalides. Vérifiez le formulaire.';
    case 429:
      return 'Trop de tentatives. Attendez quelques secondes avant de réessayer.';
    case 500:
    case 502:
    case 503:
      return 'Le serveur rencontre un problème. Réessayez dans quelques instants.';
    default:
      break;
  }

  return error.userMessage || error.message || 'Une erreur est survenue. Réessayez.';
}
