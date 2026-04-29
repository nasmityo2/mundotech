# MundoTech — E-commerce

Tienda en línea MundoTech: catálogo de productos, carrito y checkout por WhatsApp. Stack moderno con Next.js (App Router).

## Stack Tecnológico

- **Framework**: [Next.js](https://nextjs.org/) 14+ (App Router)
- **Estilos**: [Tailwind CSS](https://tailwindcss.com/)
- **Iconos**: [Lucide React](https://lucide.dev/)
- **Animaciones**: [Framer Motion](https://www.framer.com/motion/)
- **Gestión de Estado**: React Context API con persistencia en `localStorage`

## Funcionalidades

- **Catálogo de Productos**: Lista de productos con diseño claro.
- **Filtros por Categoría**: Navegación por categoría.
- **Carrito de Compras**: Panel lateral para gestionar el pedido.
- **Checkout por WhatsApp**: Mensaje preformateado para cerrar la compra.

## Empezando

### Prerrequisitos

[Node.js](https://nodejs.org/) 18+ y [npm](https://www.npmjs.com/).

### Instalación

1. Clona el repositorio y entra al proyecto (ajusta la URL a la tuya).
2. `npm install`

### Desarrollo

```sh
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Build para producción

```sh
npm run build
```

## Despliegue con PM2 (Ubuntu)

1. `npm install pm2 -g`
2. `npm run build` en el servidor
3. `pm2 start npm --name "mundotech-app" -- start`
4. `pm2 save` y `pm2 startup` según necesites reinicio automático

---

© MundoTech — Barquisimeto, Venezuela.
