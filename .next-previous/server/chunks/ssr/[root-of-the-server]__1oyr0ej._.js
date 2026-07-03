module.exports=[81111,(a,b,c)=>{b.exports=a.x("node:stream",()=>require("node:stream"))},545083,a=>a.a(async(b,c)=>{try{let b=await a.y("prettier-3c69a91af3bc4731/plugins/html");a.n(b),c()}catch(a){c(a)}},!0),142551,a=>a.a(async(b,c)=>{try{let b=await a.y("prettier-3c69a91af3bc4731/standalone");a.n(b),c()}catch(a){c(a)}},!0),688947,(a,b,c)=>{b.exports=a.x("stream",()=>require("stream"))},42,a=>a.a(async(b,c)=>{try{var d=a.i(463021),e=a.i(231191),f=a.i(433498),g=a.i(579411),h=a.i(72460),i=b([e]);[e]=i.then?(await i)():i;let p=d.Prisma.sql`immutable_unaccent(lower(coalesce(name,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(category,'') || ' ' || coalesce(sku,'') || ' ' || coalesce(description,'')))`;function j(a){return{id:a.id,slug:a.slug,name:a.name,description:a.description??"",price:(0,f.d)(a.price),originalPrice:(0,f.dn)(a.originalPrice),stock:a.stock,category:a.category,brand:a.brand,image:(0,g.firstCardImage)(a.images),images:a.images,details:{}}}function k(a){return d.Prisma.sql`(
    ${p} LIKE '%' || immutable_unaccent(lower(${a})) || '%'
    OR immutable_unaccent(lower(name)) % immutable_unaccent(lower(${a}))
  )`}function l(a){return d.Prisma.sql`
    CASE
      WHEN immutable_unaccent(lower(name)) LIKE immutable_unaccent(lower(${a})) || '%' THEN 0
      WHEN immutable_unaccent(lower(name)) LIKE '%' || immutable_unaccent(lower(${a})) || '%' THEN 1
      WHEN immutable_unaccent(lower(coalesce(brand,''))) LIKE '%' || immutable_unaccent(lower(${a})) || '%' THEN 2
      WHEN immutable_unaccent(lower(category)) LIKE '%' || immutable_unaccent(lower(${a})) || '%' THEN 3
      ELSE 4
    END ASC,
    similarity(immutable_unaccent(lower(name)), immutable_unaccent(lower(${a}))) DESC,
    "createdAt" DESC
  `}function m(a,b){let c=[d.Prisma.sql`"isActive" = true`],e=a.q??"";return e.length>=2&&c.push(k(e)),!0!==a.includeOutOfStock&&c.push(d.Prisma.sql`stock > 0`),a.category&&c.push(d.Prisma.sql`immutable_unaccent(lower(category)) = immutable_unaccent(lower(${a.category}))`),!b?.forFacets&&a.brand&&c.push(d.Prisma.sql`immutable_unaccent(lower(brand)) = immutable_unaccent(lower(${a.brand}))`),null!=a.minPrice&&c.push(d.Prisma.sql`price >= ${a.minPrice}`),null!=a.maxPrice&&c.push(d.Prisma.sql`price <= ${a.maxPrice}`),d.Prisma.join(c," AND ")}async function n(a){let b;if(b=a.q??"",1===b.length)return{items:[],total:0,facets:{categories:[],brands:[]}};let c=(a.page-1)*a.pageSize,f=m(a),g=m(a,{forFacets:!0}),i=function(a){let b=(0,h.effectiveSortForQuery)(a),c=a.q??"";switch(b){case"price-asc":return d.Prisma.sql`price ASC`;case"price-desc":return d.Prisma.sql`price DESC`;case"name-asc":return d.Prisma.sql`name ASC`;case"name-desc":return d.Prisma.sql`name DESC`;case"newest":default:return d.Prisma.sql`"createdAt" DESC`;case"relevance":return c.length>=2?l(c):d.Prisma.sql`"createdAt" DESC`}}(a),[k,n]=await Promise.all([e.prisma.$queryRaw(d.Prisma.sql`
      SELECT
        id,
        slug,
        name,
        description,
        price,
        "originalPrice",
        stock,
        category,
        brand,
        images,
        COUNT(*) OVER() AS "totalCount"
      FROM "Product"
      WHERE ${f}
      ORDER BY ${i}
      OFFSET ${c}
      LIMIT ${a.pageSize}
    `),e.prisma.$queryRaw(d.Prisma.sql`
      SELECT category, brand
      FROM "Product"
      WHERE ${g}
    `)]),o=k.length>0?Number(k[0].totalCount):0;return{items:k.map(j),total:o,facets:{categories:[...new Set(n.map(a=>a.category))].sort((a,b)=>a.localeCompare(b,"es")),brands:[...new Set(n.map(a=>a.brand).filter(a=>null!=a&&""!==a.trim()))].sort((a,b)=>a.localeCompare(b,"es"))}}}async function o(a,b=7){let c=a.trim();return c.length<2||c.length>120?[]:(await e.prisma.$queryRaw(d.Prisma.sql`
    SELECT id, slug, name, description, price, "originalPrice", stock, category, brand, images
    FROM "Product"
    WHERE ${k(c)}
      AND "isActive" = true
      AND stock > 0
    ORDER BY ${l(c)}
    LIMIT ${b}
  `)).map(j)}a.s(["queryCatalogProducts",0,n,"querySearchSuggestions",0,o]),c()}catch(a){c(a)}},!1),383550,a=>a.a(async(b,c)=>{try{var d=a.i(137936),e=a.i(905246),f=a.i(673379),g=a.i(144181),h=a.i(72460),i=a.i(42),j=a.i(713095),k=b([i]);[i]=k.then?(await k)():k;let q={products:[],totalCount:0,categories:[],brands:[]};function l(a){return{id:a.id,slug:a.slug,name:a.name,price:a.price,category:a.category,brand:a.brand,images:a.images}}function m(a){return{id:a.id,slug:a.slug,name:a.name,description:a.description,price:a.price,originalPrice:a.originalPrice,stock:a.stock,category:a.category,brand:a.brand,image:a.image,images:a.images,details:a.details}}async function n(){let a=await (0,e.headers)();return(0,f.getClientIp)(new Request("https://internal.local",{headers:a}))}async function o(a){let b=a.trim();return b.length<2||b.length>120||await (0,f.rateLimit)(`search:suggest:${await n()}`,{limit:40,windowMs:6e4})?[]:(await (0,i.querySearchSuggestions)(b,7)).map(l)}async function p({query:a,category:b,brand:c,sort:d="default",page:e=1,includeOutOfStock:j=!1,minPrice:k,maxPrice:l}){let o=a.trim();if(1===o.length||await (0,f.rateLimit)(`search:full:${await n()}`,{limit:60,windowMs:6e4}))return q;let r=(0,h.parseProductQuery)({q:o,cat:b,brand:c,sort:d,page:String(e),minPrice:null!=k?String(k):void 0,maxPrice:null!=l?String(l):void 0,disp:j?"all":void 0});r.pageSize=g.SEARCH_PAGE_SIZE,r.includeOutOfStock=j;let{items:s,total:t,facets:u}=await (0,i.queryCatalogProducts)(r);return{products:s.map(m),totalCount:t,categories:u.categories,brands:u.brands}}(0,j.ensureServerEntryExports)([o,p]),(0,d.registerServerReference)(o,"4025385e5e625ca872d2ef39f3e46ca3edec68783c",null),(0,d.registerServerReference)(p,"40702004fe53fd6b86f90d27bfd3c2789a98acd43b",null),a.s(["searchProducts",0,o,"searchProductsFull",0,p]),c()}catch(a){c(a)}},!1),334300,a=>a.a(async(b,c)=>{try{var d=a.i(326971),e=a.i(399976),f=a.i(383550),g=a.i(319731),h=b([d,e,f,g]);[d,e,f,g]=h.then?(await h)():h,a.s([]),c()}catch(a){c(a)}},!1),544659,a=>a.a(async(b,c)=>{try{var d=a.i(334300),e=a.i(326971),f=a.i(399976),g=a.i(383550),h=a.i(319731),i=b([d,e,f,g,h]);[d,e,f,g,h]=i.then?(await i)():i,a.s(["0066436ad7d77701210c6b192ba7f151ca97a70705",()=>h.getSavedAddresses,"40055e5dbd7327b88c57242c614241d1bd3a0a723a",()=>h.createSavedAddress,"4025385e5e625ca872d2ef39f3e46ca3edec68783c",()=>g.searchProducts,"40410fa8d08f033b75f9fc573a6854c33851b42568",()=>e.getProductSnapshots,"4056c8c408da2b48c676cee0bb35c81de0c247dfef",()=>h.deleteSavedAddress,"40780e050aa5e48daed8d594179c003b5cb9aa9d7a",()=>h.setDefaultAddress,"6074ca042e9e1085200877bca72d3c8eb6cb070629",()=>f.getProducts,"60c89ea27245c1204b7f75c903d9445c6baa2146c6",()=>h.updateSavedAddress]),c()}catch(a){c(a)}},!1),994653,a=>{a.v(b=>Promise.all(["server/chunks/ssr/[externals]_async_hooks_17_cyb_._.js","server/chunks/ssr/node_modules_next_dist_compiled_102ebff._.js"].map(b=>a.l(b))).then(()=>b(603450)))},344085,a=>{a.v(a=>Promise.resolve().then(()=>a(130227)))}];

//# sourceMappingURL=%5Broot-of-the-server%5D__1oyr0ej._.js.map