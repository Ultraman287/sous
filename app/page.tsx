"use client";
import React, { useState, useEffect } from "react";
import { OpenAI } from "openai";
import { db, storage } from "@/app/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Button,
  TextField,
  IconButton,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Modal,
  Badge,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import Image from "next/image";
import { fetchImageUrl } from "@/app/utils/duckduckgo";

interface Food {
  id: string;
  name: string;
  amount: number;
  imageUrl: string;
  category: string;
}

export default function Home() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [newFood, setNewFood] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [category, setCategory] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Read data from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "Food"), (snapshot) => {
      const foodData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Food[];
      setFoods(foodData);
    });

    return () => unsubscribe();
  }, []);

  // Upload image to Firebase Storage and get the download URL
  const handleImageUpload = async (file: File) => {
    const storageRef = ref(storage, `food-images/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise<string>((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // You can monitor the upload progress here if needed
        },
        (error) => {
          console.error("Image upload failed:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  // Categorize the food item using OpenAI GPT-4-o-mini model
  const categorizeFood = async (imageUrl: string): Promise<string> => {
    try {
      const response = await fetch("/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      const data = await response.json();

      console.log("data", data);

      if (response.ok) {
        return data.category;
      } else {
        console.error("Failed to categorize food:", data.error);
        return "Unknown";
      }
    } catch (error) {
      console.error("Failed to categorize food:", error);
      return "Unknown";
    }
  };

  // Add new food item
  const handleAddFood = async () => {
    let image = imageUrl.trim();
    let foodCategory = category.trim();

    if (imageFile) {
      setUploading(true);
      try {
        image = await handleImageUpload(imageFile);
      } catch (error) {
        console.error("Failed to upload image:", error);
        setUploading(false);
        return;
      }
      setUploading(false);
    } else if (!image) {
      image = await fetchImageUrl(newFood);
      setImageUrl(image || "");
    }
    if (!foodCategory && image) {
      foodCategory = await categorizeFood(image);
      setCategory(foodCategory);
    }

    if (newFood.trim() === "" || image === "") return;

    await addDoc(collection(db, "Food"), {
      name: newFood,
      amount: 1,
      imageUrl: image,
      category: foodCategory,
    });

    setNewFood("");
    setImageUrl("");
    setImageFile(null);
    setCategory("");
    setOpen(false); // Close the modal after adding
  };

  // Update food amount
  const handleUpdateFoodAmount = async (id: string, amount: number) => {
    const foodDoc = doc(db, "Food", id);
    await updateDoc(foodDoc, { amount });
  };

  // Delete food item
  const handleDeleteFood = async (id: string) => {
    const foodDoc = doc(db, "Food", id);
    await deleteDoc(foodDoc);
  };

  // Filter foods based on search term
  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box
      width={"100vw"}
      height={"100vh"}
      display={"flex"}
      alignItems={"center"}
      flexDirection={"column"}
    >
      <Stack spacing={2} width={"60vw"} alignItems={"center"}>
        <Typography variant="h1">Sous</Typography>
        <TextField
          label="Search Foods"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpen(true)}
        >
          Add Food
        </Button>
      </Stack>
      <Stack
        direction="row"
        width={"100%"}
        spacing={2}
        justifyContent="center"
        flexWrap={"wrap"}
        style={{ marginTop: 20 }}
      >
        {filteredFoods.map((food) => (
          <Card
            key={food.id}
            style={{
              marginBottom: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CardContent style={{ textAlign: "center", padding: 10 }}>
              {food.imageUrl && (
                <Image
                  src={food.imageUrl}
                  alt={food.name}
                  width={300}
                  height={300}
                  style={{ borderRadius: 8 }}
                />
              )}
              <Stack
                direction="row"
                justifyContent="start"
                alignItems="center"
                spacing={2}
                style={{ marginTop: 20, marginLeft: 20 }}
              >
                <Badge badgeContent={food.category} color="primary"></Badge>
              </Stack>

              <Typography variant="h5" margin={2}>
                {food.name}
              </Typography>
              <Typography variant="body2">Amount: {food.amount}</Typography>
              <IconButton
                onClick={() => handleUpdateFoodAmount(food.id, food.amount + 1)}
              >
                <AddIcon />
              </IconButton>
              <IconButton
                onClick={() =>
                  food.amount > 1
                    ? handleUpdateFoodAmount(food.id, food.amount - 1)
                    : handleDeleteFood(food.id)
                }
              >
                <RemoveIcon />
              </IconButton>
              <IconButton onClick={() => handleDeleteFood(food.id)}>
                <DeleteIcon />
              </IconButton>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Modal for adding new food */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          display={"flex"}
          flexDirection={"column"}
          alignItems={"center"}
          justifyContent={"center"}
          bgcolor={"white"}
          p={4}
          m={"auto"}
          width={"300px"}
          borderRadius={"8px"}
          boxShadow={3}
          position={"relative"}
          top={"20%"}
          sx={{
            transform: "translateY(-50%)",
          }}
        >
          <Typography variant="h5">Add Food Item</Typography>
          <TextField
            label="Food Name"
            variant="outlined"
            value={newFood}
            onChange={(e) => setNewFood(e.target.value)}
            style={{ marginTop: 20, marginBottom: 20 }}
          />
          <TextField
            label="Image URL (optional)"
            variant="outlined"
            value={imageUrl || imageFile?.name || ""}
            onChange={(e) => setImageUrl(e.target.value)}
            style={{ marginBottom: 20 }}
          />
          <Button
            variant="contained"
            component="label"
            style={{ marginBottom: 20 }}
          >
            Upload Image
            <input
              type="file"
              hidden
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                  setImageUrl(""); // Clear the URL if an image file is selected
                }
              }}
            />
          </Button>
          {uploading && <Typography>Uploading image...</Typography>}
          <Button variant="contained" color="primary" onClick={handleAddFood}>
            Add Food
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}
