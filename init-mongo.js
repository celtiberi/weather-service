db.createUser(
    {
      user: "sailor",
      pwd: "sailor",
      roles: [
        { role: "readWrite", db: "ocean" }
      ]
    }
  );