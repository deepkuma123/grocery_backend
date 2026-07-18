import { Request, Response } from "express";
import Stripe from "stripe";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import { inngest } from "../inngest/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const stripeWebhook = async (request: Request, response: Response) => {
    let event;
    if (endpointSecret) {
        // Get the signature sent by Stripe
        const signature = request.headers["stripe-signature"];
        try {
            event = stripe.webhooks.constructEvent(request.body, signature as string, endpointSecret);
        } catch (err) {
            console.log(`⚠️ Webhook signature verification failed.`, err.message);
            return response.sendStatus(400);
        }

        // Handle the event
        switch (event.type) {
            case "payment_intent.succeeded":
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const paymentIntentId = paymentIntent.id;

                // Getting Session Metadata
                const session = await stripe.checkout.sessions.list({
                    payment_intent: paymentIntentId,
                });
                const { orderId } = session.data[0].metadata as any;

                // Mark Payment as Paid
                const paidOrder: any = await Order.findByIdAndUpdate(orderId, { isPaid: true }, { new: true });

                // Decrease stock
                const orderItems = Array.isArray(paidOrder.items) ? paidOrder.items : ([] as any[]);

                for (const item of orderItems) {
                    await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
                }

                if (paidOrder) {
                    await inngest.send({ name: "order/placed", data: { orderId } });
                }

                // Send stock update events for each product in the order
                for (const item of orderItems) {
                    await inngest.send({ name: "inventory/stock.updated", data: { productId: item.product } });
                }
                break;

            case "payment_intent.canceled":
            case "payment_intent.payment_failed": {
                const paymentIntentFailure = event.data.object as Stripe.PaymentIntent;
                const paymentIntentFailureId = paymentIntentFailure.id;

                // Getting Session Metadata
                const sessionFailure = await stripe.checkout.sessions.list({
                    payment_intent: paymentIntentFailureId,
                });

                const failureOrderId = (sessionFailure.data[0].metadata as any).orderId;

                await Order.findByIdAndDelete(failureOrderId);
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        // Return a response to acknowledge receipt of the event
        response.json({ received: true });
    }
};
