// Logo de l'application : le fleuret forme la jambe du P, pointe allumée comme sur une touche.
export default function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <rect width="100" height="100" rx="22" fill="#225da8" />
      <path d="M43 21H57A15.5 15.5 0 0 1 57 52H43" fill="none" stroke="#fff" strokeWidth="10" strokeLinejoin="round" />
      <circle cx="37" cy="14.5" r="6" fill="#f4b73f" />
      <path d="M35 19.5H39L40.2 66H33.8Z" fill="#fff" />
      <path d="M23.5 72.5A13.5 9.2 0 0 1 50.5 72.5Z" fill="#fff" />
      <rect x="33.2" y="74" width="7.6" height="14" rx="3.8" fill="#fff" />
    </svg>
  );
}
