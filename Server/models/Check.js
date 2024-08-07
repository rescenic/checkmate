const mongoose = require("mongoose");
const EmailService = require("../service/emailService");

const CheckSchema = mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Monitor",
      immutable: true,
    },
    status: {
      type: Boolean,
    },
    responseTime: {
      type: Number, 
    },
    statusCode: {
      type: Number, 
    },
    message: {
      type: String,
    },
    expiry: {
      type: Date,
      default: Date.now,
      expires: 60 * 60 * 24 * 30, 
    },
  },
  {
    timestamps: true,
  }
);

CheckSchema.pre("save", async function (next) {
  try {
    const monitor = await mongoose.model("Monitor").findById(this.monitorId);
    if (monitor) {
      // Check if the monitor has notifications
      if (monitor.notifications && monitor.notifications.length > 0) {
        if (monitor.status !== this.status) {
          const emailService = new EmailService();

          if (monitor.status === true && this.status === false) {
            // Notify user that the monitor is down
            const users = await mongoose.model("User").find({ _id: monitor.userId });
            if (users.length > 0) {
              const user = users[0];
              await emailService.buildAndSendEmail(
                "serverIsDownTemplate",
                { monitorName: monitor.name, monitorUrl: monitor.url },
                user.email,
                `Monitor ${monitor.name} is down`
              );
            }
          }

          if (monitor.status === false && this.status === true) {
            // Notify user that the monitor is up
            const users = await mongoose.model("User").find({ _id: monitor.userId });
            if (users.length > 0) {
              const user = users[0];
              await emailService.buildAndSendEmail(
                "serverIsUpTemplate",
                { monitorName: monitor.name, monitorUrl: monitor.url },
                user.email,
                `Monitor ${monitor.name} is back up`
              );
            }
          }
          monitor.status = this.status;
          await monitor.save();
        }
      }
    }
  } catch (error) {
    console.log(error);
  } finally {
    next();
  }
});


module.exports = mongoose.model("Check", CheckSchema);
