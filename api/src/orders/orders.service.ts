import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { APP_STORE } from '../store/store.constants';
import { AppStore, Order, TicketType } from '../store/store';

/** Service fee applied on top of the ticket subtotal. */
export const SERVICE_FEE_PERCENT = 10;

@Injectable()
export class OrdersService {
  constructor(@Inject(APP_STORE) private readonly store: AppStore) {}
  create(dto: CreateOrderDto): Order {
    if (dto.items.length === 0) {
      throw new BadRequestException(
        'Debes seleccionar al menos una localidad',
      );
    }

    const event = this.store.events.find((item) => item.id === dto.eventId);

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    // Reject duplicate ticket types before doing any other work.
    const ticketTypeIds = dto.items.map((line) => line.ticketTypeId);

    if (new Set(ticketTypeIds).size !== ticketTypeIds.length) {
      throw new BadRequestException(
        'No puedes repetir la misma localidad en una orden',
      );
    }

    const reservations: Array<{
      ticketType: TicketType;
      quantity: number;
    }> = [];
    
    // Validate all lines and build the order items without mutating inventory yet.
    const items = dto.items.map((line) => {
      const ticketType = event.ticketTypes.find(
        (type) => type.id === line.ticketTypeId,
      );

      if (!ticketType) {
        throw new NotFoundException('Localidad no encontrada');
      }
       if (!Number.isInteger(line.quantity) || line.quantity < 1) {
        throw new BadRequestException(
          'La cantidad debe ser un entero mayor o igual a 1',
        );
      }

      if (line.quantity > ticketType.maxPerOrder) {
        throw new BadRequestException(
          `No puedes comprar más de ${ticketType.maxPerOrder} entradas de ${ticketType.name}`,
        );
      }

      if (line.quantity > ticketType.remaining) {
        throw new BadRequestException(
          `No hay suficientes entradas de ${ticketType.name}`,
        );
      }

      reservations.push({
        ticketType,
        quantity: line.quantity,
      });

      return {
        ticketTypeId: ticketType.id,
        name: ticketType.name,
        quantity: line.quantity,
        unitPriceCents: ticketType.priceCents,
        lineTotalCents: ticketType.priceCents * line.quantity,
      };
    });

    const subtotalCents = items.reduce(
      (sum, item) => sum + item.lineTotalCents,
      0,
    );
    // Fee is calculated once from integer cents and rounded to the nearest cent.
    const feeCents = Math.round(
      (subtotalCents * SERVICE_FEE_PERCENT)/100
    );

    const order: Order = {
      id: `ord_${randomUUID()}`,
      eventId: event.id,
      status: 'pending',
      items,
      subtotalCents,
      feeCents,
      totalCents: subtotalCents + feeCents,
      buyer: null,
      createdAt: new Date().toISOString(),
    };

    // All validations passed: reserve inventory only now.
    for (const reservation of reservations) {
      reservation.ticketType.remaining -= reservation.quantity;
    }

    this.store.orders.set(order.id, order);
    return order;
  }

  findById(id: string): Order {
    const order = this.store.orders.get(id);

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    return order;
  }

  confirm(id: string, dto: ConfirmOrderDto): Order {
    const order = this.findById(id);

    // Only pending orders can transition to confirmed.
    if(order.status !== 'pending'){
      throw new BadRequestException(
        'La orden ya fue confirmada o no está pendiente'
      );
    }
    // Snapshot ticket name and price so later event changes do not alter the order.
    const name = dto.name.trim();

    if(!name){
      throw new BadRequestException('El nombre es obligatorio');
    }

    order.status = 'confirmed';
    order.buyer = { name, email: dto.email.trim() };
    return order;
  }
}
