var learnername = ""; // Nome do aluno
var completed = false; // Status da AI: completada ou não
var score = 0; // Nota do aluno (de 0 a 100)
var scormExercise = 1; // Exercício corrente relevante ao SCORM
var screenExercise = 1; // Exercício atualmente visto pelo aluno (não tem relação com scormExercise)
var scorm = pipwerks.SCORM; // Seção SCORM
scorm.version = "2004"; // Versão da API SCORM
var PING_INTERVAL = 5 * 60 * 1000; // milissegundos
var pingCount = 0; // Conta a quantidade de pings enviados para o LMS

//-- Parâmetros próprios da AI
var N_EXERCISES = 1; // Quantidade de exercícios desta AI

//var init_tries = 0;
//var MAX_INIT_TRIES = 60;
//----------------------------


// Inicia a AI.
$(document).ready(function(){
  
  $('#exercicios').tabs({
      select: function(event, ui) {
        screenExercise = ui.index + 1;
        
        //--- Hook de alteração da VISUALIZAÇÃO de exercício
        // Nada
        //--------------------------------------------------
      }
  });
                                       
  $('#button1').button().click(function () {
  
    //-- Hook de pré-avaliação do exercício 1
    // Nada
    //---------------------------------------
    
    evaluateExercise();
    
    //-- Hook de pós-avaliação do exercício 1
    // Nada
    //---------------------------------------
  });
  
  $('#button2').button().click(function () {
  
    //-- Hook de pré-avaliação do exercício 2
    // Nada
    //---------------------------------------
    
    evaluateExercise();
    
    //-- Hook de pós-avaliação do exercício 2
    // Nada
    //---------------------------------------
  });
  
  tryInit();
  //initAI();
});

function tryInit () {
	var swfOk = false;
	try {
		var pxTeste = document.ggbApplet.getXCoord("P");
		swfOk = true;
	}
	catch(error) {
		log.error("Falhou comunicação GeoGebra.");
		setTimeout("tryInit()", 1000);
	}
	
	if(swfOk) initAI();
}

// Encerra a AI.
$(window).unload(function (){
  if (!completed) {
    save2LMS();
    scorm.quit();
  }
});

/*
 * Inicia a AI.
 */ 
function initAI () {
 
  // Conecta-se ao LMS
  var connected = scorm.init();
  
  // A tentativa de conexão com o LMS foi bem sucedida.
  if (connected) {
  
    // Verifica se a AI já foi concluída.
    var completionstatus = scorm.get("cmi.completion_status");
    
    // A AI já foi concluída.
    switch (completionstatus) {
    
      // Primeiro acesso à AI
      case "not attempted":
      case "unknown":
      default:
        completed = false;
        learnername = scorm.get("cmi.learner_name");
        scormExercise = 1;
        score = 0;
        
        $(".completion-message").removeClass("completion-message-on").addClass("completion-message-off");    
        break;
        
      // Continuando a AI...
      case "incomplete":
        completed = false;
        learnername = scorm.get("cmi.learner_name");
        scormExercise = parseInt(scorm.get("cmi.location"));
        score = parseInt(scorm.get("cmi.score.raw"));
        
        $(".completion-message").removeClass("completion-message-on").addClass("completion-message-off");
        break;
        
      // A AI já foi completada.
      case "completed":
        completed = true;
        learnername = scorm.get("cmi.learner_name");
        scormExercise = parseInt(scorm.get("cmi.location"));
        score = parseInt(scorm.get("cmi.score.raw"));
        
        $(".completion-message").removeClass("completion-message-off").addClass("completion-message-on");
        break;
    }
    
    if (isNaN(scormExercise)) scormExercise = 1;
    if (isNaN(score)) score = 0;
    
    // Posiciona o aluno no exercício da vez
    screenExercise = scormExercise;
    $('#exercicios').tabs("select", scormExercise - 1);  
    
    pingLMS();
    
    //-- Hook de inicialização da AI (dependente da seção SCORM) --
    // Nada
    //-------------------------------------------------------------
    
  }
  // A tentativa de conexão com o LMS falhou.
  else {
    completed = false;
    learnername = "";
    scormExercise = 1;
    score = 0;
    log.error("A conexão com o Moodle falhou.");
  }
  
  // (Re)abilita os exercícios já feitos e desabilita aqueles ainda por fazer.
  if (completed) $('#exercicios').tabs("option", "disabled", []);
  else {
    for (i = 0; i < N_EXERCISES; i++) {
      if (i < scormExercise) $('#exercicios').tabs("enable", i);
      else $('#exercicios').tabs("disable", i);
    }
  }
  
  //-- Hook de inicialização da AI (independente da seção SCORM) --
  var X_MIN = -4;
  var X_MAX = +4;
  var Y_MIN = -4;
  var Y_MAX = +4;
  
  var f1 = getRandom(X_MIN, X_MAX, Y_MIN, Y_MAX);
  var f2 = getRandom(X_MIN, X_MAX, Y_MIN, Y_MAX);
  var f3 = [-(f1[0] + f2[0]), -(f1[1] + f2[1])];
  var v  = getRandom(X_MIN, X_MAX, Y_MIN, Y_MAX);
  
  //log.error(f1);
  //log.error(f2);
  //log.error(f3);
  //log.error("soma x: " + (f1[0] + f2[0] + f3[0]));
  //log.error("soma y: " + (f1[1] + f2[1] + f3[1]));
  
  var x = document.ggbApplet.getXCoord("P");
  var y = document.ggbApplet.getYCoord("P");
  
  document.ggbApplet.setCoords("F12", x + f1[0], y + f1[1]);
  document.ggbApplet.setCoords("F22", x + f2[0], y + f2[1]);
  document.ggbApplet.setCoords("F32", x + f3[0], y + f3[1]);
  document.ggbApplet.setCoords("V2", v[0], v[1]);
  
  massas = ["0,5", "1", "1,5", "2"];
  var i = Math.floor(massas.length * Math.random());
  $("#massa").html(massas[i]);
  //---------------------------------------------------------------
}

/*
 * Salva cmi.score.raw, cmi.location e cmi.completion_status no LMS
 */ 
function save2LMS () {
  if (scorm.connection.isActive) {
  
    // Salva no LMS a nota do aluno.
    var success = scorm.set("cmi.score.raw", score);
  
    // Notifica o LMS que esta atividade foi concluída.
    success = scorm.set("cmi.completion_status", (completed ? "completed" : "incomplete"));
    
    // Salva no LMS o exercício que deve ser exibido quando a AI for acessada novamente.
    success = scorm.set("cmi.location", scormExercise);
    
    if (!success) log.error("Falha ao enviar dados para o LMS.");
  }
  else {
    log.trace("A conexão com o LMS não está ativa.");
  }
}

/*
 * Mantém a conexão com LMS ativa, atualizando a variável cmi.session_time
 */
function pingLMS () {

	scorm.get("cmi.completion_status");
	var timer = setTimeout("pingLMS()", PING_INTERVAL);
}

/*
 * Avalia a resposta do aluno ao exercício atual. Esta função é executada sempre que ele pressiona "terminei".
 */ 
function evaluateExercise (event) {

  // Avalia a nota
  var currentScore = getScore(screenExercise);

  // Mostra a mensagem de erro/acerto
  feedback(screenExercise, currentScore);

  // Atualiza a nota do LMS (apenas se a questão respondida é aquela esperada pelo LMS)
  if (!completed && screenExercise == scormExercise) {
    score = Math.max(0, Math.min(score + currentScore, 100));
    
    if (scormExercise < N_EXERCISES) {
      nextExercise();
    }
    else {
      completed = true;
      scormExercise = 1;
      save2LMS();
      scorm.quit();
    }
  }
}

/*
 * Prepara o próximo exercício.
 */ 
function nextExercise () {
  if (scormExercise < N_EXERCISES) ++scormExercise;
  
  $('#exercicios').tabs("enable", (scormExercise - 1));
  
  //-- Hook na mudança de exercício --
  // Nada
  //----------------------------------
}

/*
 * Avalia a nota do aluno num dado exercício
 * HOOK DE AVALIAÇÃO
 */ 
function getScore (exercise) {

  ans = 0;

  switch (exercise) {
  
    // Avalia a nota do exercício 1
    case 1:
      var v_x = document.ggbApplet.getXcoord('V2');
      var v_y = document.ggbApplet.getYcoord('V2');

      var p_x = document.ggbApplet.getXcoord('P');
      var p_y = document.ggbApplet.getYcoord('P');

      var a_x = document.ggbApplet.getXcoord('A');
      var a_y = document.ggbApplet.getYcoord('A');
   
      var b_x = document.ggbApplet.getXcoord('B');
      var b_y = document.ggbApplet.getYcoord('B');

      var seg_x = b_x - a_x;
      var seg_y = b_y - a_y;
      
      if (Math.abs(a_x - p_x) < 0.1 &&
          Math.abs(a_y - p_y) < 0.1 &&
          Math.abs(Math.atan2(seg_y, seg_x) - Math.atan2(v_y, v_x)) < 2/*graus*/ * Math.PI / 180)
      {
        ans = 100;
      } 

    default:
      break;
  }
            
  return ans;
}

/*
 * Exibe a mensagem de erro/acerto (feedback) do aluno para um dado exercício e nota (naquele exercício).
 * HOOK DE FEEDBACK 
 */

function feedback (exercise, score) {
                     
  switch (exercise) {
  
    // Feedback da resposta ao exercício 1
    case 1:
    default:
      if (score == 100) {
          $('#message1').html('<p/>Resposta correta!').removeClass().addClass("right-answer");
      } else {
          $('#message1').html('<p/>Resposta incorreta.').removeClass().addClass("wrong-answer");
      }
      
      break;
  }
}

function getRandom (xmin, xmax, ymin, ymax) {
  var x = xmin + Math.floor((xmax - xmin + 1) * Math.random());
  var y = ymin + Math.floor((ymax - ymin + 1) * Math.random());
  if (x == 0 && y == 0) y = 1;
  return [x, y];
}

var log = {};

log.trace = function (message) {
  if(window.console && window.console.firebug){
    console.log(message);
  }
  else {
    alert(message);
  }  
}

log.error = function (message) {
  if( (window.console && window.console.firebug) || console){
    console.error(message);
  }
  else {
    alert(message);
  }
}

