async function validateAsset(executionContext) {
    try {
        const formContext = executionContext.getFormContext();
        const lookupField = formContext.getAttribute("fgs_asset");

        if (lookupField && lookupField.getValue()) {
            const selectedRecord = lookupField.getValue()[0];

            const result = await Xrm.WebApi.retrieveRecord(
                selectedRecord.entityType,
                selectedRecord.id,
                "?$select=fgs_assetstatus"
            );

            const statusLabels = {
                795540000: "Operational",
                795540001: "Requires Attention",
                795540002: "Requires Repair",
                795540003: "Retired/Sold"
            };

            const statusLabel = statusLabels[result.fgs_assetstatus] || "Unknown";

            if (statusLabel !== "Operational") {
                formContext.ui.setFormNotification(
                    `Warning: The selected asset is marked as "${statusLabel}" and is not operational. Do you still want to proceed with its allocation?`,
                    "WARNING",
                    "statusWarning"
                );
            } else {
                formContext.ui.clearFormNotification("statusWarning");
            }
        } else {
            formContext.ui.clearFormNotification("statusWarning");
        }
    } catch (error) {
        throw new Error(`Asset Validation Error: ${error.message}`);
    }
}
