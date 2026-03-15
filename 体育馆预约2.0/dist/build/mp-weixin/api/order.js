"use strict";const e=require("../utils/request.js");exports.completeUserOrder=function(r){return e.post(`/order/${r}/complete`)},exports.getOrderDetail=function(r){return e.get(`/order/${r}`)};
