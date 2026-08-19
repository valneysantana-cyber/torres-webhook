"use strict";

/**
 * ProspectContext.js — contexto de vendas escolhido por telefone (prospect).
 *
 * Quando um lead SEM reserva escreve, o roteador de intencao decide qual
 * tenant de vendas atende (cc_saas_erp = HubGenial site+ERP p/ PMEs, ou
 * cc_sales = ConciergeCloud hospedagem) e PERSISTE a escolha aqui para a
 * conversa nao pular de contexto no meio (decisao Valney 19/08/2026).
 */

const mongoose = require("mongoose");

const prospectContextSchema = new mongoose.Schema({
  phoneClean: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
}, { collection: "prospect_contexts" });

module.exports = mongoose.models.ProspectContext || mongoose.model("ProspectContext", prospectContextSchema);
