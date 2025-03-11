const prisma = require("../config/dbConnect");

const createArea = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: "Area name is required" });
    }

    const newArea = await prisma.area.create({
      data: { name },
    });

    res.status(201).json(newArea);
  } catch (error) {
    console.error("Error creating area:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllAreas = async (req, res) => {
    try {
      const areas = await prisma.area.findMany();
      res.status(200).json(areas);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };


const updateArea = async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
  
      if (!name) {
        return res.status(400).json({ error: "Area name is required" });
      }
  
      const updatedArea = await prisma.area.update({
        where: { id },
        data: { name },
      });
  
      res.status(200).json(updatedArea);
    } catch (error) {
      console.error("Error updating area:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  
const deleteArea = async (req, res) => {
    try {
      const { id } = req.params;
  
      await prisma.area.delete({
        where: { id },
      });
  
      res.status(200).json({ message: "Area deleted successfully" });
    } catch (error) {
      console.error("Error deleting area:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  

  module.exports = {
    createArea,
    getAllAreas,
    updateArea,
    deleteArea,
  };