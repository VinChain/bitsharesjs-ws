let _this;

let ecc_config = {
    address_prefix: process.env.npm_config__graphene_ecc_default_address_prefix || "VIN"
};

_this = {
    core_asset: "VIN",
    address_prefix: "VIN",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    review_in_secs_committee: 24 * 60 * 60,
    networks: {
        VinChain: {
            core_asset: "VIN",
            address_prefix: "VIN",
            chain_id: "bd805b0381c4da33e8f1db6bfbfd57f7762739a38ff67d9fd9f67265d04dbce9"
        },
        VinChainTest: {
            core_asset: "VIN",
            address_prefix: "VIN",
            chain_id: "3d883d444747a21e63596d79c67149189161c82c075494ed179261fec2ca708b"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function(chain_id) {

        let i, len, network, network_name, ref;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }

                // console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

                return {
                    network_name: network_name,
                    network: network
                }
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }

    },

    reset: function() {
        _this.core_asset = "VIN";
        _this.address_prefix = "VIN";
        ecc_config.address_prefix = "VIN";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function(prefix = "GPH") {
        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }
}

export default _this;
