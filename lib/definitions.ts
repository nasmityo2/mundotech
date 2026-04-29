export type OrderStatus =
  | 'Pendiente verificación Binance'
  | 'Pendiente'
  | 'En Proceso'
  | 'Enviado'
  | 'Entregado'
  | 'Cancelado';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface OrderItem {
  id?:         string;
  productId:   string;
  productName: string;
  quantity:    number;
  price:       number;
  imageUrl?:   string;
}

export interface ShippingDetails {
  address:  string;
  city:     string;
  state:    string;
  zipCode:  string;
  country:  string;
}

/** Tipo de pedido normalizado para toda la UI — compatible con el modelo Prisma Order. */
export interface Order {
  id:              string;
  orderNumber:     number;
  createdAt:       string;
  customerId:      string | null;
  customerName:    string;
  customerEmail?:  string | null;
  customerPhone?:  string | null;
  customerIdNumber?: string | null;
  items:           OrderItem[];
  total:           number;
  status:          OrderStatus;
  shippingDetails: ShippingDetails;
  paymentMethod:   string;
  paymentBank?:              string | null;
  paymentHolderIdNumber?:    string | null;
  paymentHolderPhone?:       string | null;
  paymentReference?:         string | null;
  paymentProofUrl?:          string | null;
  notes?:          string | null;
}

/** Mapea un registro Prisma (con items incluidos) al tipo Order de la UI. */
export function prismaOrderToOrder(o: {
  id: string;
  orderNumber: number;
  createdAt: Date;
  customerId: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerIdNumber?: string | null;
  total: number;
  status: string;
  paymentMethod: string;
  paymentBank?: string | null;
  paymentHolderIdNumber?: string | null;
  paymentHolderPhone?: string | null;
  paymentReference?: string | null;
  paymentProofUrl?: string | null;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipCode: string;
  shippingCountry: string;
  notes?: string | null;
  items: { id: string; productId: string; productName: string; quantity: number; price: number; imageUrl?: string | null }[];
}): Order {
  return {
    id:              o.id,
    orderNumber:     o.orderNumber,
    createdAt:       o.createdAt.toISOString(),
    customerId:      o.customerId,
    customerName:    o.customerName,
    customerEmail:   o.customerEmail,
    customerPhone:   o.customerPhone,
    customerIdNumber: o.customerIdNumber,
    total:           o.total,
    status:          o.status as OrderStatus,
    paymentMethod:   o.paymentMethod,
    paymentBank:              o.paymentBank,
    paymentHolderIdNumber:    o.paymentHolderIdNumber,
    paymentHolderPhone:       o.paymentHolderPhone,
    paymentReference:         o.paymentReference,
    paymentProofUrl:          o.paymentProofUrl,
    notes:           o.notes,
    shippingDetails: {
      address:  o.shippingAddress,
      city:     o.shippingCity,
      state:    o.shippingState,
      zipCode:  o.shippingZipCode,
      country:  o.shippingCountry,
    },
    items: o.items.map(i => ({
      id:          i.id,
      productId:   i.productId,
      productName: i.productName,
      quantity:    i.quantity,
      price:       i.price,
      imageUrl:    i.imageUrl ?? undefined,
    })),
  };
}
