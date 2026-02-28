local Constants = {}

Constants.ProposalStatus = {
	PENDING = "pending",
	APPROVED = "approved",
	REJECTED = "rejected",
	VETOED = "vetoed"
}

Constants.VoteDecision = {
	APPROVE = "approve",
	REJECT = "reject",
	VETO = "veto",
	NULL = "null" -- Adicionado para votos expirados ou abstenções
}

Constants.EffectType = {
	TAX_CHANGE = "tax_change",
	TAX_FLOOR = "tax_floor",
	TAX_CEILING = "tax_ceiling",
	TAX_DISTRIBUTION = "tax_distribution",
	BASE_PRICE = "base_price",
	PRICE_FLOOR = "price_floor",
	PRICE_CEILING = "price_ceiling",
	REGULATION = "regulation"
}

return Constants
