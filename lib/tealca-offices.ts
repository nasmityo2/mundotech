/**
 * Lista blanca oficial de oficinas TEALCA por estado (paralela a lib/zoom-offices.ts).
 * Fuente: API REST de Tealca (tealca-oficinas/v1/offices).
 * Cada oficina incluye nombre, ciudad y código de oficina.
 * El estado es el proporcionado por la API de Tealca.
 */
export interface TealcaOffice {
  /** Nombre de la oficina Tealca. */
  name: string;
  /** Dirección completa (no disponible vía API). */
  address?: string;
  /** Ciudad donde se ubica la oficina. */
  city: string;
  /** Código interno de la oficina Tealca. */
  code: string;
}

export const tealcaOffices: Record<string, TealcaOffice[]> = {
  "Anzoátegui": [
    {
      name: "Anaco",
      city: "Anaco",
      code: "2912"
    },
    {
      name: "Barcelona",
      city: "Barcelona",
      code: "2907"
    },
    {
      name: "El Tigre",
      city: "El Tigre",
      code: "2901"
    },
    {
      name: "Lechería",
      city: "Lechería",
      code: "2906"
    },
    {
      name: "Puerto La Cruz",
      city: "Puerto La Cruz",
      code: "2909"
    },
    {
      name: "Puerto Piritu",
      city: "Puerto Piritu",
      code: "J2911"
    },
  ],
  "Apure": [
    {
      name: "San Fernando De Apure",
      city: "San Fernando De Apure",
      code: "J5307"
    },
  ],
  "Aragua": [
    {
      name: "Cagua",
      city: "Cagua",
      code: "5115"
    },
    {
      name: "La Morita",
      city: "Turmero",
      code: "5117"
    },
    {
      name: "La Victoria",
      city: "La Victoria",
      code: "5118"
    },
    {
      name: "Las Delicias",
      city: "Maracay",
      code: "5122"
    },
    {
      name: "Maracay Este (av. Sucre)",
      city: "Maracay",
      code: "5113"
    },
    {
      name: "Maracay Oeste",
      city: "Maracay",
      code: "5119"
    },
    {
      name: "Oficina Comercial Maracay",
      city: "Maracay",
      code: "CC"
    },
    {
      name: "Tealca Maracay Sector Santa Ana",
      city: "Maracay",
      code: "5113B"
    },
    {
      name: "Turmero",
      city: "Turmero",
      code: "5120"
    },
  ],
  "Barinas": [
    {
      name: "Alto Barinas",
      city: "Alto Barinas",
      code: "8006"
    },
    {
      name: "Barinas",
      city: "Socopo",
      code: "J8006"
    },
    {
      name: "Barinas Centro Comercial Barinas",
      city: "Barinas Centro Comercial Barinas",
      code: "8006B"
    },
    {
      name: "Barinitas",
      city: "Barinitas",
      code: "8007"
    },
    {
      name: "Santa Barbara De Barinas",
      city: "Santa Barbara De Barinas",
      code: "8008"
    },
  ],
  "Bolívar": [
    {
      name: "Ciudad Bolivar",
      city: "Ciudad Bolívar",
      code: "3210"
    },
    {
      name: "Puerto Ordaz Alta Vista",
      city: "Puerto Ordaz",
      code: "3205B"
    },
    {
      name: "Puerto Ordaz Castillito",
      city: "Puerto Ordaz",
      code: "3205"
    },
    {
      name: "San Félix (el Roble)",
      city: "San Félix",
      code: "3208"
    },
    {
      name: "Unare",
      city: "Unare",
      code: "3207"
    },
    {
      name: "Upata",
      city: "Upata",
      code: "3208B"
    },
    {
      name: "Ventuari",
      city: "Puerto Ordaz",
      code: "3209"
    },
  ],
  "Carabobo": [
    {
      name: "Caucagua – Higuerote – Barlovento – Tacarigua",
      city: "Caucagua – Higuerote – Barlovento – Tacarigua",
      code: "J1306"
    },
    {
      name: "Guacara",
      city: "Guacara",
      code: "5214"
    },
    {
      name: "Naguanagua",
      city: "Valencia",
      code: "5209"
    },
    {
      name: "Oficina Comercial Valencia",
      city: "Valencia",
      code: "DD"
    },
    {
      name: "Puerto Cabello Moron",
      city: "Puerto Cabello",
      code: "J5215"
    },
    {
      name: "San Diego",
      city: "Valencia",
      code: "5210"
    },
    {
      name: "Tocuyito",
      city: "Valencia",
      code: "5211"
    },
    {
      name: "Valencia (av. Andrés Eloy Blanco)",
      city: "Valencia",
      code: "5201"
    },
    {
      name: "Valencia (distribuidor San Blas)",
      city: "Valencia",
      code: "5207"
    },
    {
      name: "Valencia (plaza La Candelaria)",
      city: "Valencia",
      code: "5207B"
    },
    {
      name: "Valencia (zona Industrial Norte)",
      city: "Valencia",
      code: "5208"
    },
    {
      name: "Valencia Sur (paseo Las Industrias)",
      city: "Valencia",
      code: "5206"
    },
  ],
  "Cojedes": [
    {
      name: "San Carlos",
      city: "San Carlos",
      code: "5402"
    },
    {
      name: "Tinaquillo",
      city: "Tinaquillo",
      code: "5403"
    },
  ],
  "Delta Amacuro": [
    {
      name: "Tucupita",
      city: "Tucupita",
      code: "3300"
    },
  ],
  "Distrito Capital": [
    {
      name: "Av. Victoria",
      city: "Av. Victoria",
      code: "FF"
    },
    {
      name: "Boleíta",
      city: "Boleíta",
      code: "1114"
    },
    {
      name: "Catia",
      city: "Catia",
      code: "1125"
    },
    {
      name: "Ccct",
      city: "Ccct",
      code: "1137B"
    },
    {
      name: "El Cafetal",
      city: "El Cafetal",
      code: "1142"
    },
    {
      name: "El Cementerio",
      city: "El Cementerio",
      code: "1128B"
    },
    {
      name: "El Paraíso",
      city: "El Paraíso",
      code: "1126"
    },
    {
      name: "El Rosal – Chacao",
      city: "El Rosal – Chacao",
      code: "1137"
    },
    {
      name: "Filas De Mariches",
      city: "Filas De Mariches",
      code: "1132"
    },
    {
      name: "Junquito",
      city: "El Junquito",
      code: "1141"
    },
    {
      name: "La California",
      city: "La California",
      code: "1114C"
    },
    {
      name: "La Candelaria",
      city: "La Candelaria",
      code: "1128"
    },
    {
      name: "La Candelaria C.c. Lord Center",
      city: "La Candelaria C.c. Lord Center",
      code: "1128C"
    },
    {
      name: "La Trinidad",
      city: "La Trinidad",
      code: "1110"
    },
    {
      name: "Los Caobos",
      city: "Los Caobos",
      code: "1131"
    },
    {
      name: "Los Chaguaramos",
      city: "Los Chaguaramos",
      code: "AA"
    },
    {
      name: "Los Palos Grandes",
      city: "Los Palos Grandes",
      code: "1127"
    },
    {
      name: "Montecristo",
      city: "Montecristo",
      code: "1114B"
    },
    {
      name: "Prados Del Este",
      city: "Prados Del Este",
      code: "1133"
    },
    {
      name: "Quinta Crespo Internacional",
      city: "Quinta Crespo Internacional",
      code: "EXPNN"
    },
    {
      name: "Sabana Grande",
      city: "Sabana Grande",
      code: "1102"
    },
    {
      name: "San Martin",
      city: "San Martin",
      code: "1119"
    },
  ],
  "Falcón": [
    {
      name: "Coro",
      city: "Coro",
      code: "7607"
    },
    {
      name: "Punta Cardon",
      city: "Punta Cardon",
      code: "7608"
    },
    {
      name: "Punto Fijo",
      city: "Punto Fijo",
      code: "7607B"
    },
  ],
  "Guárico": [
    {
      name: "Calabozo",
      city: "Calabozo",
      code: "5501"
    },
    {
      name: "San Juan De Los Morros – Villa De Cura",
      city: "San Juan De Los Morros – Villa De Cura",
      code: "J5121"
    },
    {
      name: "Valle De La Pascua",
      city: "Valle de La Pascua",
      code: "5303"
    },
  ],
  "La Guaira": [
    {
      name: "Caraballeda",
      city: "Caraballeda",
      code: "1233"
    },
    {
      name: "Catia La Mar",
      city: "Catia La Mar",
      code: "J1231"
    },
    {
      name: "Maiquetia",
      city: "Maiquetia",
      code: "1234"
    },
  ],
  "Lara": [
    {
      name: "Barquisimeto Carrera 19",
      city: "Barquisimeto",
      code: "7918C"
    },
    {
      name: "Barquisimeto Este",
      city: "Barquisimeto",
      code: "7910"
    },
    {
      name: "Barquisimeto Oeste",
      city: "Barquisimeto",
      code: "7918"
    },
    {
      name: "Barquisimeto Oeste Av. Las Industrias",
      city: "Barquisimeto",
      code: "7918B"
    },
    {
      name: "Barquisimeto Sur",
      city: "Barquisimeto",
      code: "7912"
    },
    {
      name: "Cabudare",
      city: "Cabudare",
      code: "7915"
    },
    {
      name: "Carora",
      city: "Carora",
      code: "7916"
    },
    {
      name: "El Tocuyo",
      city: "El Tocuyo",
      code: "J7901"
    },
    {
      name: "Oficina Comercial Barquisimeto",
      city: "Barquisimeto",
      code: "GG"
    },
  ],
  "Miranda": [
    {
      name: "Charallave",
      city: "Charallave",
      code: "1501"
    },
    {
      name: "Guarenas",
      city: "Guarenas",
      code: "1305"
    },
    {
      name: "Guatire",
      city: "Guatire",
      code: "1302"
    },
    {
      name: "Higuerote",
      city: "Higuerote",
      code: "1503"
    },
    {
      name: "Los Teques",
      city: "Los Teques",
      code: "1405B"
    },
    {
      name: "San Antonio De Los Altos",
      city: "San Antonio de los A",
      code: "1405"
    },
    {
      name: "Santa Teresa",
      city: "Santa Teresa",
      code: "J1503"
    },
  ],
  "Monagas": [
    {
      name: "El Tejero Punta De Mata El Furrial",
      city: "Maturín",
      code: "J3009"
    },
    {
      name: "Maturín Este (c.c. Juanico)",
      city: "Maturín",
      code: "3005"
    },
    {
      name: "Oficina Comercial Maturín",
      city: "Maturín",
      code: "RR"
    },
    {
      name: "Temblador",
      city: "Maturín",
      code: "J3008"
    },
    {
      name: "Tipuro",
      city: "Maturín",
      code: "3007"
    },
  ],
  "Mérida": [
    {
      name: "Bailadores – Tovar – Lagunillas – Santa Cruz De Mora",
      city: "Bailadores – Tovar – Lagunillas – Santa Cruz De Mora",
      code: "J8305"
    },
    {
      name: "Caja Seca",
      city: "Caja Seca",
      code: "8204C"
    },
    {
      name: "El Vigía",
      city: "El Vigía",
      code: "8307"
    },
    {
      name: "Merida",
      city: "Merida",
      code: "8301B"
    },
    {
      name: "Merida Norte",
      city: "Merida Norte",
      code: "8308"
    },
  ],
  "Nueva Esparta": [
    {
      name: "Cocheima",
      city: "La Asuncion",
      code: "2706C"
    },
    {
      name: "Juan Griego",
      city: "Juan Griego",
      code: "2706B"
    },
    {
      name: "Porlamar",
      city: "Los Robles",
      code: "2706"
    },
  ],
  "Portuguesa": [
    {
      name: "Acarigua",
      city: "Acarigua",
      code: "5401B"
    },
    {
      name: "Guanare",
      city: "Guanare",
      code: "7705"
    },
  ],
  "Sucre": [
    {
      name: "Carupano",
      city: "Carupano",
      code: "2803"
    },
    {
      name: "Cumaná",
      city: "Cumana",
      code: "2802"
    },
  ],
  "Trujillo": [
    {
      name: "Valera",
      city: "Valera",
      code: "8204"
    },
    {
      name: "Valera-Centro",
      city: "Valera",
      code: "8204B"
    },
  ],
  "Táchira": [
    {
      name: "Capacho",
      city: "Capacho",
      code: "8115C"
    },
    {
      name: "La Fria",
      city: "La fria",
      code: "8113"
    },
    {
      name: "La Grita",
      city: "La Grita",
      code: "J8132"
    },
    {
      name: "Paramillo",
      city: "San Cristobal",
      code: "8112"
    },
    {
      name: "San Antonio Del Tachira",
      city: "San Antonio del Tach",
      code: "8112B"
    },
    {
      name: "San Cristobal",
      city: "San Cristobal",
      code: "8115"
    },
    {
      name: "San Cristóbal (barrio Obrero)",
      city: "San Cristobal",
      code: "8111"
    },
    {
      name: "San Cristóbal Sur",
      city: "San Cristobal",
      code: "8114"
    },
    {
      name: "Tariba",
      city: "Tariba",
      code: "8115B"
    },
    {
      name: "Ureña",
      city: "Ureña",
      code: "8107"
    },
  ],
  "Yaracuy": [
    {
      name: "San Felipe",
      city: "San Felipe",
      code: "7802"
    },
    {
      name: "Yaritagua",
      city: "Yaritagua",
      code: "J7917"
    },
    {
      name: "Yaritagua",
      city: "Yaritagua",
      code: "J7804"
    },
  ],
  "Zulia": [
    {
      name: "Bella Vista 5 De Julio",
      city: "Maracaibo",
      code: "8502"
    },
    {
      name: "Cabimas",
      city: "Cabimas",
      code: "8405"
    },
    {
      name: "Ciudad Ojeda",
      city: "Ciudad Ojeda",
      code: "8406"
    },
    {
      name: "Delicias 5 De Julio",
      city: "Maracaibo",
      code: "8502B"
    },
    {
      name: "Dr. Portillo",
      city: "Maracaibo",
      code: "8511"
    },
    {
      name: "Machiques Villa Del Rosario",
      city: "Villa del Rosario",
      code: "J8516"
    },
    {
      name: "Maracaibo Centro Cc Gran Bazar",
      city: "Maracaibo",
      code: "8511B"
    },
    {
      name: "Maracaibo Circunvalacion 2 Sur Oeste",
      city: "Maracaibo",
      code: "8513B"
    },
    {
      name: "Maracaibo Delicias Norte Centro Comercial El Pilar",
      city: "Maracaibo",
      code: "8513C"
    },
    {
      name: "Maracaibo Norte",
      city: "Maracaibo",
      code: "8514"
    },
    {
      name: "Maracaibo Oeste – La Limpia",
      city: "Maracaibo",
      code: "8513"
    },
    {
      name: "Maracaibo Sur (la Coromoto)",
      city: "Maracaibo",
      code: "8509B"
    },
    {
      name: "Maracaibo Sur (san Francisco)",
      city: "Maracaibo",
      code: "8509"
    },
    {
      name: "Oficina Comercial Maracaibo – Cecilio Acosta",
      city: "Maracaibo",
      code: "BB"
    },
    {
      name: "Santa Barbara Del Zulia",
      city: "Santa Barbara Del Zulia",
      code: "8307B"
    },
  ],
};
