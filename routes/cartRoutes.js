const express = require('express');
const Cart = require('../models/cart');
const Product = require('../models/product');
const router = express.Router();

// GET cart by user ID and populate product details
router.get('/:userId', async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.params.userId }).populate('products.productId');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }
    res.json({ cartId: cart._id, products: cart.products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new product to cart and populate product details
router.post('/', async (req, res) => {
  const { userId, productId, quantity } = req.body;

  try {
    console.log('Adding to cart: ', { userId, productId, quantity });

    let cart = await Cart.findOne({ userId });
    const product = await Product.findById(productId);

    // Check if the product exists
    if (!product) {
      console.log('Product not found:', productId);
      return res.status(404).json({ message: 'Product not found' });
    }

    // If the cart does not exist, create a new one
    if (!cart) {
      console.log('Cart not found, creating a new cart for user:', userId);
      cart = new Cart({ userId, products: [{ productId, quantity }] });
    } else {
      console.log('Cart found, updating existing cart for user:', userId);
      const existingProductIndex = cart.products.findIndex(p => p.productId.toString() === productId);
      
      // Update the quantity if the product already exists in the cart
      if (existingProductIndex >= 0) {
        console.log('Product already in cart, updating quantity');
        cart.products[existingProductIndex].quantity += quantity;
      } else {
        console.log('Product not in cart, adding product');
        cart.products.push({ productId, quantity });
      }
    }

    // Save the cart and return the updated products
    await cart.save();
    await cart.populate('products.productId');
    
    res.status(201).json({ cartId: cart._id, products: cart.products });
  } catch (err) {
    console.error('Error adding product to cart:', err.message);
    res.status(500).json({ message: 'Error adding product to cart', error: err.message });
  }
});

// PUT update product quantity in cart and populate product details
router.put('/:cartId/:productId', async (req, res) => {
  try {
    const cart = await Cart.findById(req.params.cartId).populate('products.productId');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    const productIndex = cart.products.findIndex(p => p.productId._id.toString() === req.params.productId);
    if (productIndex >= 0) {
      cart.products[productIndex].quantity = req.body.quantity;
      await cart.save();
      await cart.populate('products.productId');
      res.json({ cartId: cart._id, products: cart.products });
    } else {
      res.status(404).json({ message: 'Product not found in cart' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE product from cart and populate product details
router.delete('/:cartId/:productId', async (req, res) => {
  try {
    const { cartId, productId } = req.params;

    // Find the cart by cartId
    const cart = await Cart.findById(cartId).populate('products.productId');
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Remove the product from the cart
    cart.products = cart.products.filter(p => p.productId._id.toString() !== productId);

    await cart.save();
    await cart.populate('products.productId');
    res.json({ cartId: cart._id, products: cart.products });
  } catch (err) {
    res.status(500).json({ message: 'Error removing product', error: err.message });
  }
});

module.exports = router;
