router.post('/ssl/create-session/:orderId', (req, res) => {
    const orderId = req.params['orderId'];
    console.log(orderId);
    const siteUrl = 'https://api.shajao.com/';
    const successUrl = siteUrl + 'payment/order/success/' + orderId;
    const failureUrl = siteUrl + 'payment/order/payment-failed/' + orderId;
    const cancelUrl = siteUrl + 'payment/order/payment-cancelled/' + orderId;
    const ipnUrl = siteUrl + 'payment/ssl/ipn';

    Order.getOneRowPopulated({_id: orderId}, (err, data) => {
        if (err) {
            res.status(Constant.ERROR_STATUS).json(err)
        } else {
            var options = {
                method: 'POST',
                url: 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
                body: {
                    store_id: 'shaja5df87f7bb42aa',
                    store_passwd: 'shaja5df87f7bb42aa@ssl',
                    total_amount: (data.price - data.discount),
                    currency: 'BDT',
                    tran_id: orderId,
                    success_url: successUrl,
                    fail_url: failureUrl,
                    cancel_url: cancelUrl,

                    ipn_url: ipnUrl,

                    emi_option: 0,

                    cus_name: data.user.name,
                    cus_email: data.user.email,
                    cus_add1: data.addresses.billing.address,
                    // cus_add2: 'Dhaka',
                    cus_city: data.addresses.billing.city,
                    // cus_postcode: '1219',
                    cus_phone: data.addresses.billing.phone,
                    // cus_fax: '01700743213',

                    shipping_method: 'NO',
                    // ship_name: 'courier',
                    // ship_add1: '48/1, West Chawdhury Para, E Hajipara, Dhaka 1219',
                    // ship_city: 'Dhaka',
                    // ship_postcode: '1219',
                    // ship_country: '1219',
                    num_of_item: data.products.length,

                    product_name: 'Photo Frame',
                    product_category: 'Photo Frames',
                    product_profile: 'physical-goods',
                    value_a: orderId,


                },
                json: true
            };

            let test = new SSLCommerzPayment(options.body, false);
            test.then((data) => {
                res.status(Constant.SUCCESS_STATUS).json({
                    status: 'success',
                    data: data['GatewayPageURL'],
                    logo: data['storeLogo'],

                });
            })
        }
    });



    // request(options, function (error, response, body) {
    //     if (error) {
    //         res.status(400).json(error)
    //     } else {
    //         res.status(200).json(response);
    //     }
    // });
});









router.post('/ssl/ipn', (req, res) => {
    const val_id = encodeURI(req.body.val_id);

    const store_id = encodeURI('shaja5df87f7bb42aa');
    const store_passwd = encodeURI('shaja5df87f7bb42aa@ssl');
    const requested_url = ("https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=" + val_id + "&store_id=" + store_id + "&store_passwd=" + store_passwd + "&v=1&format=json");

    var options = {
        method: 'GET',
        url: requested_url,
        json: true
    };

    request(options, function (error, response, body) {
        console.log(response.body)
        if (response.body.status === 'VALID' && response.body.APIConnect === 'DONE') {
            const orderId = response.body.value_a;

            Order.updateOneData({_id: orderId}, {
                status: 'new',
                paymentMethod: 'SSL',
                transaction_id: response.body.tran_id,
                card_type: response.body.card_type,
                bank_tran_id: response.body.bank_tran_id,
            }, (err, data) => {
                if (error) {
                    // res.json("Failed to connect with SSLCOMMERZ")
                } else {
                    mail(data._id, null);
                    // res.json(response.body)
                }
            })
        } else {
            const orderId = response.body.value_a;
            Order.updateOneData({_id: orderId}, {
                status: 'archived',
                transaction_id: response.body.tran_id,
                paymentMethod: 'SSL',
                card_type: 'payment-failure',
            }, (err, data) => {
                // if (error) {
                //     res.json("Failed to connect with SSLCOMMERZ")
                // } else {
                //     res.json(response.body)
                // }
            })
        }

    });
});
