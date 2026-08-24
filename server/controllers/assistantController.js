const {
  getAssistantReply
} = require(
  '../services/assistantService'
);

const {
  hasDonorCapability,
  normalizeDonor
} = require(
  '../services/donorIdentityService'
);

// POST /api/assistant/chat — Feature 20
exports.chatWithAssistant =
  async (req, res) => {
    const {
      message,
      bloodGroup,
      language
    } = req.body || {};

    if (
      !message ||
      !String(message).trim()
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Message is required'
        });
    }

    /*
  
    */

    const donor =
      hasDonorCapability(
        req.user
      )
        ? normalizeDonor(
            req.user
          )
        : null;

    const donorId =
      donor?._id || null;

    /*
     * Prefer authoritative account data.
     *
     * Patient-donor blood group:
     * donorProfile.bloodGroup
     *
     * Plain Patient blood group:
     * user.bloodGroup
     *
     * Anonymous/manual fallback:
     * bloodGroup from request
     */
    const targetBloodGroup =
      donor?.bloodGroup ||
      req.user?.bloodGroup ||
      bloodGroup ||
      null;

    const result =
      await getAssistantReply({
        message:
          String(message)
            .trim(),

        donorId,

        bloodGroup:
          targetBloodGroup,

        language,

        userRole:
          req.user?.role ||
          null,

        hasDonorCapability:
          Boolean(donor)
      });

    res.json({
      success: true,
      data: result
    });
  };