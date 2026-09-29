import { plural } from '../components/resultPresentation.js';

// « 1 rencontre », « 3 rencontres » : nombre + accord réel, au lieu de « rencontre(s) ».
export const withCount = (count, singular, multiple) => `${count} ${plural(count, singular, multiple)}`;
