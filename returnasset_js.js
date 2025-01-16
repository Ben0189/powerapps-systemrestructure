async function returnAsset(gridContext) {
    try {
        const recordIds = getSelectedRecordIds(gridContext);
        const updatePromises = []; // Array to collect all update promises

        for (const recordId of recordIds) {
            const assetName = await fetchAssetName(recordId);

            const dialogResult = await openDialog(assetName);

            if (dialogResult) {
                const updatePromise = handleDialogSuccess(recordId, dialogResult);
                updatePromises.push(updatePromise);
            }
        }

        // Wait for all updates to complete
        await Promise.all(updatePromises);

        // Refresh the grid after all updates are completed
        refreshGrid(gridContext);
    } catch (error) {
        handleError(error);
    }
}

function getSelectedRecordIds(gridContext) {
    const selectedRowsObj = gridContext.getGrid().getSelectedRows();
    const selectedRows = selectedRowsObj._collection;

    if (!selectedRows || Object.keys(selectedRows).length === 0) {
        throw new Error("No assets selected. Please select at least one asset to return.");
    }

    return Object.values(selectedRows).map((row) => row._entityId.guid);
}

function openDialog(assetName) {
    const pageInput = {
        pageType: "webresource",
        webresourceName: "fgs_returnasset_status_dialog",
        data: JSON.stringify({ assetName })
    };

    const navigationOptions = {
        target: 2,
        width: 400,
        height: 500,
        position: 1,
        title: `Update Status for Asset: ${assetName}`
    };

    return Xrm.Navigation.navigateTo(pageInput, navigationOptions).catch((error) => {
        throw error;
    });
}

async function handleDialogSuccess(recordId, dialogResult) {
    const selectedStatus = dialogResult.returnValue.selectedStatus; //input from user
    const statusNote = dialogResult.returnValue.statusNote; //input from user

    try {
        const projectAssetUpdateData = {
            fgs_statusafterreturn: selectedStatus,
            fgs_assetassignmentstatus: 2,
            fgs_returneddate: new Date().toISOString(),
            fgs_returnstatuscomments: statusNote
        };

        await Xrm.WebApi.updateRecord("fgs_projectasset", recordId, projectAssetUpdateData);

        const assetId = await fetchAssetIdFromProjectAsset(recordId);
        if (assetId) {
            const assetUpdateData = {
                fgs_assetstatus: selectedStatus
            };

            await Xrm.WebApi.updateRecord("fgs_asset", assetId, assetUpdateData);
        }
    } catch (error) {
        throw error;
    }
}

function handleError(error) {
    Xrm.Navigation.openAlertDialog({
        text: `An error occurred: ${error.message}`,
        title: "Error"
    });
}

async function fetchAssetName(recordId) {
    const projectAssetEntityName = "fgs_projectasset";
    const navigationProperty = "fgs_Asset";
    const assetNameField = "fgs_name";

    try {
        const query = `?$select=${navigationProperty}&$expand=${navigationProperty}($select=${assetNameField})`;
        const projectAsset = await Xrm.WebApi.retrieveRecord(projectAssetEntityName, recordId, query);

        const asset = projectAsset[navigationProperty];
        if (asset && asset[assetNameField]) {
            return asset[assetNameField];
        } else {
            throw new Error("Asset Name not found.");
        }
    } catch (error) {
        throw new Error(`Failed to fetch Asset Name for Project Asset ID: ${recordId}`);
    }
}

async function fetchAssetIdFromProjectAsset(recordId) {
    const navigationProperty = "fgs_Asset";
    const assetIdField = "fgs_assetid";

    try {
        const query = `?$select=${navigationProperty}&$expand=${navigationProperty}($select=${assetIdField})`;
        const projectAsset = await Xrm.WebApi.retrieveRecord("fgs_projectasset", recordId, query);

        const asset = projectAsset[navigationProperty];
        if (asset && asset[assetIdField]) {
            return asset[assetIdField];
        } else {
            return null;
        }
    } catch (error) {
        throw new Error(`Failed to fetch related Asset ID for Project Asset ID: ${recordId}`);
    }
}

function refreshGrid(gridContext) {
    try {
        gridContext.refresh();
    } catch (error) {
        Xrm.Navigation.openAlertDialog({
            text: "An error occurred while refreshing the grid. Please reload the page manually.",
            title: "Grid Refresh Error"
        });
    }
}