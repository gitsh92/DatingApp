using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NetworkApp.API.Data;
using NetworkApp.API.Dtos;
using NetworkApp.API.Helpers;
using NetworkApp.API.Models;

namespace NetworkApp.API.Controllers
{
  [ApiController]
  [Authorize]
  [ServiceFilter(typeof(LogUserActivity))]
  [Route("api/users/{userId}/[controller]")]
  public class MessagesController : ControllerBase
  {
    private readonly IDatingRepository _repo;
    private readonly IMapper _mapper;
    public MessagesController(IDatingRepository repo, IMapper mapper)
    {
      _mapper = mapper;
      _repo = repo;
    }

    [HttpGet]
    public async Task<IActionResult> GetMessagesForUser(int userId, [FromQuery] MessageParams messageParams)
    {
      if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
        return Unauthorized();

      messageParams.UserId = userId;

      var messagesFromRepo = await _repo.GetMessagesForUser(messageParams);

      var messagesToReturn = _mapper.Map<IEnumerable<MessageForReturnDto>>(messagesFromRepo);

      Response.AddPagination(messagesFromRepo.CurrentPage,
        messagesFromRepo.PageSize, messagesFromRepo.TotalCount, messagesFromRepo.TotalPages);

      return Ok(messagesToReturn);
    }

    [HttpGet("{id}", Name = "GetMessage")]
    public async Task<IActionResult> GetMessage(int userId, int id)
    {
      if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
        return Unauthorized();

      var messageFromRepo = await _repo.GetMessage(id);

      if (messageFromRepo == null)
        return NotFound();

      return Ok(messageFromRepo);
    }

    [HttpGet("thread/{id}")]
    public async Task<IActionResult> GetMessageThread(int userId, int id)
    {
      if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
        return Unauthorized();

      var messagesFromRepo = await _repo.GetMessageThread(userId, id);

      var threadToReturn = _mapper.Map<IEnumerable<MessageForReturnDto>>(messagesFromRepo);

      return Ok(threadToReturn);
    }

    [HttpPost]
    public async Task<IActionResult> CreateMessage(int userId, MessageForCreationDto messageForCreationDto)
    {
      if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
        return Unauthorized();

      messageForCreationDto.SenderId = userId;

      var recipient = await _repo.GetUser(messageForCreationDto.RecipientId);
      var sender = await _repo.GetUser(messageForCreationDto.SenderId);

      if (recipient == null)
        return BadRequest("Could not find user");

      var message = _mapper.Map<Message>(messageForCreationDto);

      _repo.Add(message);

      var messageToReturn = _mapper.Map<MessageForReturnDto>(message);

      if (await _repo.SaveAll())
        return CreatedAtRoute("GetMessage", new { userId, id = message.Id }, messageToReturn);

      throw new Exception("Failed to save message");
    }

    [HttpPost("{id}")]
    public async Task<IActionResult> DeleteMessage(int userId, int id)
    {
      if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
        return Unauthorized();

      var messageFromRepo = await _repo.GetMessage(id);

      if (messageFromRepo == null)
        return NotFound();

      if (messageFromRepo.SenderId == userId)
        messageFromRepo.SenderDeleted = true;

      if (messageFromRepo.RecipientId == userId)
        messageFromRepo.RecipientDeleted = true;

      if (messageFromRepo.SenderDeleted && messageFromRepo.RecipientDeleted)
        _repo.Delete(messageFromRepo);

      if (await _repo.SaveAll())
        return NoContent();

      throw new Exception("Failed to delete message");
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkMessageAsRead(int userId, int id)
    {
      if (userId != int.Parse(User.FindFirst(ClaimTypes.NameIdentifier).Value))
        return Unauthorized();

      var messageFromRepo = await _repo.GetMessage(id);

      if (messageFromRepo == null)
        return NotFound();

      if (messageFromRepo.RecipientId != userId)
        return BadRequest("You are not the recipient of this message");

      messageFromRepo.IsRead = true;
      messageFromRepo.DateRead = DateTime.Now;

      await _repo.SaveAll();

      return NoContent();
    }
  }
}