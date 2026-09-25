import type {ReactNode} from 'react';

export const QUEBEC_CITY_LIST_ID = 'quebec-city-options';

// A practical, searchable starter list. Keep the input editable so any Québec
// municipality can still be entered even when it is not in this curated list.
export const QUEBEC_CITIES = [
  'Montréal', 'Québec', 'Laval', 'Gatineau', 'Longueuil', 'Sherbrooke', 'Lévis',
  'Trois-Rivières', 'Saguenay', 'Terrebonne', 'Saint-Jean-sur-Richelieu',
  'Repentigny', 'Brossard', 'Drummondville', 'Saint-Jérôme', 'Granby',
  'Blainville', 'Saint-Hyacinthe', 'Shawinigan', 'Dollard-des-Ormeaux',
  'Rimouski', 'Victoriaville', 'Rouyn-Noranda', 'Saint-Eustache', 'Magog',
  'Vaudreuil-Dorion', 'Châteauguay', 'Mirabel', 'Mascouche', 'Côte-Saint-Luc',
  'Saint-Georges', 'Val-d’Or', 'Salaberry-de-Valleyfield', 'Joliette',
  'Thetford Mines', 'Alma', 'Sept-Îles', 'Baie-Comeau', 'Amos', 'Gaspé',
  'Sainte-Julie', 'Candiac', 'La Prairie', 'Saint-Constant', 'Saint-Lambert',
  'Beloeil', 'Chambly', 'Carignan', 'Mont-Saint-Hilaire',
  'Saint-Bruno-de-Montarville', 'Saint-Basile-le-Grand', 'Varennes',
  'Sorel-Tracy', 'Sainte-Thérèse', 'Boisbriand', 'Rosemère', 'Lorraine',
  'Bois-des-Filion', 'Deux-Montagnes', 'Pointe-Claire', 'Beaconsfield',
  'Kirkland', 'Dorval', 'Westmount', 'Hampstead', 'Montréal-Ouest',
  'Mont-Royal', 'L’Île-Perrot', 'Pincourt', 'Rigaud', 'Saint-Sauveur',
  'Sainte-Adèle', 'Mont-Tremblant', 'Rivière-du-Loup', 'La Tuque', 'Matane',
  'Montmagny', 'Chibougamau', 'Percé', 'L’Assomption', 'Sainte-Marie',
  'Lachute', 'Cowansville', 'Farnham', 'Rawdon', 'Prévost', 'Val-des-Monts',
  'Chelsea', 'Cantley', 'Saint-Colomban', 'Sainte-Marthe-sur-le-Lac',
  'Saint-Lazare', 'Saint-Augustin-de-Desmaures', 'L’Ancienne-Lorette',
  'Saint-Nicolas', 'Charlesbourg', 'Beauport', 'Val-Bélair', 'Jonquière',
  'La Baie', 'Mont-Laurier', 'Saint-Félicien', 'Forestville', 'Havre-Saint-Pierre',
  'Sainte-Anne-des-Monts', 'Carleton-sur-Mer', 'Chandler', 'Valcourt', 'Waterloo',
  'Louiseville', 'Donnacona', 'Saint-Raymond', 'Port-Cartier',
] as const;

export function QuebecCityOptions({children}:{children:ReactNode}) {
  return <>{children}<datalist id={QUEBEC_CITY_LIST_ID}>{QUEBEC_CITIES.map(city=><option key={city} value={city}/>)}</datalist></>;
}
