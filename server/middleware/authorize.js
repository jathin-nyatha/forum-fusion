const authorize = (options = {}) => {
  const { roles = [], permissions = [] } = options;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Authentication required.",
      });
    }

    // Check roles if specified
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Insufficient role privileges.",
      });
    }

    // Check permissions if specified
    if (permissions.length > 0) {
      const hasAllPermissions = permissions.every(
        (permission) => req.user.permissions && req.user.permissions[permission]
      );

      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Insufficient permissions.",
        });
      }
    }

    // Authentication and authorization successful
    next();
  };
};

export default authorize;
